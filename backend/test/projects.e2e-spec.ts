import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { API, createTestApp, type TestApp } from './support/app';
import { buildWorld, login, type Session, type World } from './support/world';

let t: TestApp;
let w: World;
const server = () => request(t.app.getHttpServer());
const sessions = {} as Record<keyof World['users'], Session>;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(() => t.close());
beforeEach(async () => {
  w = await buildWorld(t.prisma);
  for (const key of Object.keys(w.users) as (keyof World['users'])[]) {
    sessions[key] = await login(t, w.users[key].email);
  }
});

const transition = (who: keyof World['users'], projectId: string, body: Record<string, unknown>) =>
  server().post(`${API}/projects/${projectId}/transitions`).set(sessions[who].auth).send(body);

describe('parcours complet du workflow, rôle par rôle', () => {
  it('DRAFT → COMPLETED, chaque étape par le bon rôle, historisée et auditée', async () => {
    const p = w.projectA2;
    await transition('clientA2', p, { to: 'SUBMITTED' }).expect(200);
    await transition('adminA', p, { to: 'PENDING_ASSIGNMENT' }).expect(200);

    for (const key of ['pmA', 'engineerA', 'architectA', 'salesA'] as const) {
      await server()
        .post(`${API}/projects/${p}/assignments`)
        .set(sessions.adminA.auth)
        .send({ userId: w.users[key].id, role: w.users[key].role })
        .expect(201);
    }
    await transition('adminA', p, { to: 'ASSIGNED' }).expect(200);
    await transition('engineerA', p, { to: 'ENGINEERING' }).expect(200);
    await transition('engineerA', p, { to: 'ARCHITECTURE' }).expect(200);
    await transition('architectA', p, { to: 'INTERNAL_REVIEW' }).expect(200);
    await transition('pmA', p, { to: 'COMMERCIAL_REVIEW' }).expect(200);
    await transition('salesA', p, { to: 'CLIENT_REVIEW' }).expect(200);
    await transition('clientA2', p, { to: 'CLIENT_APPROVED' }).expect(200);
    await transition('pmA', p, { to: 'COMPLETED' }).expect(200);

    const history = await server().get(`${API}/projects/${p}/history`).set(sessions.pmA.auth);
    expect(history.body).toHaveLength(10);
    expect(await t.prisma.system.auditLog.count({ where: { projectId: p, action: 'project.transition' } })).toBe(10);
  });

  it('refuse d’affecter l’équipe avant d’avoir un ingénieur ET un architecte', async () => {
    await t.prisma.system.project.update({ where: { id: w.projectA2 }, data: { status: 'PENDING_ASSIGNMENT' } });
    await server()
      .post(`${API}/projects/${w.projectA2}/assignments`)
      .set(sessions.adminA.auth)
      .send({ userId: w.users.engineerA.id, role: 'ENGINEER' })
      .expect(201);
    const res = await transition('adminA', w.projectA2, { to: 'ASSIGNED' });
    expect(res.status).toBe(409);
    expect(res.body.error.details).toEqual({ refusal: 'MISSING_ASSIGNMENTS', detail: 'ARCHITECT' });
  });
});

describe('validation client (T10, EF-401/402) — publication, commentaire, validation, notification', () => {
  async function toClientReview(): Promise<string> {
    const p = w.projectA2;
    await transition('clientA2', p, { to: 'SUBMITTED' }).expect(200);
    await transition('adminA', p, { to: 'PENDING_ASSIGNMENT' }).expect(200);
    for (const key of ['pmA', 'engineerA', 'architectA', 'salesA'] as const) {
      await server()
        .post(`${API}/projects/${p}/assignments`)
        .set(sessions.adminA.auth)
        .send({ userId: w.users[key].id, role: w.users[key].role })
        .expect(201);
    }
    await transition('adminA', p, { to: 'ASSIGNED' }).expect(200);
    await transition('engineerA', p, { to: 'ENGINEERING' }).expect(200);
    await transition('engineerA', p, { to: 'ARCHITECTURE' }).expect(200);
    await transition('architectA', p, { to: 'INTERNAL_REVIEW' }).expect(200);
    await transition('pmA', p, { to: 'COMMERCIAL_REVIEW' }).expect(200);
    t.mailer.outbox.length = 0; // ne garder que les notifications du test lui-même
    await transition('salesA', p, { to: 'CLIENT_REVIEW' }).expect(200);
    return p;
  }

  it('le commercial publie : le client reçoit une notification simple', async () => {
    await toClientReview();
    const mail = t.mailer.outbox.find((m) => m.to === w.users.clientA2.email);
    expect(mail).toBeDefined();
    expect(mail!.subject).toContain('Proposition disponible');
  });

  it('le client valide : le chef de projet est notifié, la transition est auditée', async () => {
    const p = await toClientReview();
    t.mailer.outbox.length = 0;
    await transition('clientA2', p, { to: 'CLIENT_APPROVED' }).expect(200);

    const mail = t.mailer.outbox.find((m) => m.to === w.users.pmA.email);
    expect(mail).toBeDefined();
    expect(mail!.subject).toContain('validé');

    const entries = await t.prisma.system.auditLog.findMany({ where: { projectId: p, action: 'project.transition' } });
    expect(entries.some((e) => (e.details as { to?: string } | null)?.to === 'CLIENT_APPROVED')).toBe(true);
  });

  it('le client commente : le motif est conservé dans l’historique ET transmis dans la notification', async () => {
    const p = await toClientReview();
    t.mailer.outbox.length = 0;
    const reason = 'Merci de prévoir une redondance sur le lien Internet principal.';
    await transition('clientA2', p, { to: 'CLIENT_COMMENTS', reason }).expect(200);

    const history = await server().get(`${API}/projects/${p}/history`).set(sessions.pmA.auth);
    expect(history.body[0]).toMatchObject({ toStatus: 'CLIENT_COMMENTS', reason });

    const mail = t.mailer.outbox.find((m) => m.to === w.users.pmA.email);
    expect(mail).toBeDefined();
    expect(mail!.text).toContain(reason);
  });

  it('une panne d’envoi ne bloque jamais la transition (best-effort)', async () => {
    const p = await toClientReview();
    const spy = vi.spyOn(t.mailer, 'send').mockRejectedValueOnce(new Error('SMTP indisponible'));
    const res = await transition('clientA2', p, { to: 'CLIENT_APPROVED' });
    expect(res.status).toBe(200);
    spy.mockRestore();
  });
});

describe('contrôle des transitions par le backend', () => {
  it('refuse une transition hors table', async () => {
    const res = await transition('architectA', w.projectA1, { to: 'CLIENT_APPROVED' });
    expect(res.status).toBe(409);
    expect(res.body.error.details.refusal).toBe('UNKNOWN_TRANSITION');
  });

  it('refuse à un rôle non autorisé : « Permissions insuffisantes »', async () => {
    const res = await transition('salesA', w.projectA1, { to: 'INTERNAL_REVIEW' });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('Permissions insuffisantes');
  });

  it('un rôle interne doit être affecté au projet pour agir', async () => {
    await t.prisma.system.projectAssignment.deleteMany({ where: { userId: w.users.architectA.id } });
    // Plus affecté : le projet lui devient invisible.
    expect((await transition('architectA', w.projectA1, { to: 'INTERNAL_REVIEW' })).status).toBe(404);
  });

  it('un retour en arrière exige un motif (ADR 0005)', async () => {
    await t.prisma.system.project.update({ where: { id: w.projectA1 }, data: { status: 'INTERNAL_REVIEW' } });
    const missing = await transition('pmA', w.projectA1, { to: 'ARCHITECTURE' });
    expect(missing.status).toBe(409);
    expect(missing.body.error.details.refusal).toBe('REASON_REQUIRED');

    const ok = await transition('pmA', w.projectA1, { to: 'ARCHITECTURE', reason: 'Pas de redondance du cœur' });
    expect(ok.status).toBe(200);
    const last = await t.prisma.system.projectStatusHistory.findFirstOrThrow({ where: { projectId: w.projectA1 } });
    expect(last.reason).toBe('Pas de redondance du cœur');
    expect(await t.prisma.system.auditLog.count({ where: { action: 'project.transition.reverse' } })).toBe(1);
  });

  it('aucun retour depuis CLIENT_APPROVED', async () => {
    await t.prisma.system.project.update({ where: { id: w.projectA1 }, data: { status: 'CLIENT_APPROVED' } });
    for (const to of ['REVISION', 'ARCHITECTURE', 'CLIENT_REVIEW']) {
      const res = await transition('pmA', w.projectA1, { to, reason: 'essai' });
      expect(res.status, to).toBe(409);
    }
  });

  it('le statut ne s’écrit que par les transitions : aucune route ne l’accepte ailleurs', async () => {
    const res = await server()
      .post(`${API}/projects`)
      .set(sessions.adminA.auth)
      .send({ name: 'Projet forcé', clientCompanyId: w.companyA1, status: 'COMPLETED' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('DRAFT');
  });

  it('propose à chacun les seules actions qu’il peut réellement faire', async () => {
    const pm = await server().get(`${API}/projects/${w.projectA1}/transitions`).set(sessions.pmA.auth);
    expect(pm.body).toEqual([]);
    const architect = await server().get(`${API}/projects/${w.projectA1}/transitions`).set(sessions.architectA.auth);
    expect(architect.body).toEqual([
      { to: 'INTERNAL_REVIEW', labelKey: 'workflow.submitInternalReview', requiresReason: false },
    ]);
  });
});

describe('visibilité des projets', () => {
  const names = async (who: keyof World['users']) =>
    ((await server().get(`${API}/projects`).set(sessions[who].auth)).body.data as { name: string }[]).map((p) => p.name).sort();

  it('ADMIN voit tous les projets de son locataire', async () => {
    expect(await names('adminA')).toEqual(['Projet A1', 'Projet A2']);
  });

  it('un rôle interne ne voit que ses projets affectés', async () => {
    expect(await names('engineerA')).toEqual(['Projet A1']);
  });

  it('un CLIENT ne voit que les projets de sa société', async () => {
    expect(await names('clientA1')).toEqual(['Projet A1']);
    expect(await names('clientA2')).toEqual(['Projet A2']);
  });

  it('un chef de projet qui crée un projet en devient responsable et le voit', async () => {
    await server()
      .post(`${API}/projects`)
      .set(sessions.pmA.auth)
      .send({ name: 'Projet du chef', clientCompanyId: w.companyA2 })
      .expect(201);
    expect(await names('pmA')).toEqual(['Projet A1', 'Projet du chef']);
  });
});

describe('affectations', () => {
  it('le rôle affecté doit correspondre au rôle de l’utilisateur', async () => {
    const res = await server()
      .post(`${API}/projects/${w.projectA2}/assignments`)
      .set(sessions.adminA.auth)
      .send({ userId: w.users.salesA.id, role: 'ARCHITECT' });
    expect(res.status).toBe(422);
  });

  it('un client ne s’affecte pas à un projet', async () => {
    const res = await server()
      .post(`${API}/projects/${w.projectA2}/assignments`)
      .set(sessions.adminA.auth)
      .send({ userId: w.users.clientA1.id, role: 'CLIENT' });
    expect(res.status).toBe(422);
  });

  it('refuse un doublon d’affectation', async () => {
    const res = await server()
      .post(`${API}/projects/${w.projectA1}/assignments`)
      .set(sessions.adminA.auth)
      .send({ userId: w.users.engineerA.id, role: 'ENGINEER' });
    expect(res.status).toBe(409);
  });
});

describe('partage (T13, EF-401/402) — inviter un utilisateur de l’organisation avec un droit borné', () => {
  it('un utilisateur non affecté ne voit pas le projet, avant tout partage', async () => {
    const res = await server().get(`${API}/projects/${w.projectA2}`).set(sessions.architectA.auth);
    expect(res.status).toBe(404);
  });

  it('le partage rend le projet visible à un utilisateur non affecté', async () => {
    // adminA voit tout le locataire (ORGANIZATION) : c'est lui qui invite ici, pas pmA, qui ne voit
    // même pas projectA2 sans y être déjà affecté ou partagé — on ne peut pas inviter sur un
    // projet qu'on ne voit pas soi-même.
    const share = await server()
      .post(`${API}/projects/${w.projectA2}/shares`)
      .set(sessions.adminA.auth)
      .send({ userId: w.users.architectA.id, right: 'READ' });
    expect(share.status).toBe(201);
    expect(share.body).toMatchObject({ right: 'READ', user: { id: w.users.architectA.id } });

    const res = await server().get(`${API}/projects/${w.projectA2}`).set(sessions.architectA.auth);
    expect(res.status).toBe(200);
  });

  it('un droit LECTURE ne permet pas d’éditer l’architecture ; EDIT le permet (réinviter change le droit)', async () => {
    await server().post(`${API}/projects/${w.projectA2}/shares`).set(sessions.adminA.auth).send({ userId: w.users.architectA.id, right: 'READ' });

    const readOnly = await server()
      .put(`${API}/projects/${w.projectA2}/architecture`)
      .set(sessions.architectA.auth)
      .send({ elements: [], connections: [], zones: [] });
    expect(readOnly.status).toBe(403);

    // Réinviter le même utilisateur change son droit (upsert), pas de doublon.
    const upgraded = await server()
      .post(`${API}/projects/${w.projectA2}/shares`)
      .set(sessions.adminA.auth)
      .send({ userId: w.users.architectA.id, right: 'EDIT' });
    expect(upgraded.status).toBe(201);
    expect(upgraded.body.right).toBe('EDIT');

    const edited = await server()
      .put(`${API}/projects/${w.projectA2}/architecture`)
      .set(sessions.architectA.auth)
      .send({ elements: [], connections: [], zones: [] });
    expect(edited.status).toBe(200);
  });

  it('révoquer le partage retire la visibilité', async () => {
    const share = await server()
      .post(`${API}/projects/${w.projectA2}/shares`)
      .set(sessions.adminA.auth)
      .send({ userId: w.users.architectA.id, right: 'EDIT' });

    await server().delete(`${API}/projects/${w.projectA2}/shares/${share.body.id}`).set(sessions.adminA.auth).expect(204);

    const res = await server().get(`${API}/projects/${w.projectA2}`).set(sessions.architectA.auth);
    expect(res.status).toBe(404);
  });

  it('refuse de partager avec un compte CLIENT', async () => {
    const res = await server()
      .post(`${API}/projects/${w.projectA2}/shares`)
      .set(sessions.adminA.auth)
      .send({ userId: w.users.clientA1.id, right: 'READ' });
    expect(res.status).toBe(422);
  });

  it('refuse de se partager un projet à soi-même', async () => {
    const res = await server()
      .post(`${API}/projects/${w.projectA2}/shares`)
      .set(sessions.adminA.auth)
      .send({ userId: w.users.adminA.id, right: 'EDIT' });
    expect(res.status).toBe(422);
  });

  it('pas de lien public : partager exige un identifiant utilisateur existant de la même organisation', async () => {
    const res = await server()
      .post(`${API}/projects/${w.projectA2}/shares`)
      .set(sessions.adminA.auth)
      .send({ userId: w.users.engineerB.id, right: 'READ' });
    expect(res.status).toBe(404);
  });

  it('un rôle sans project.share est refusé', async () => {
    const res = await server()
      .post(`${API}/projects/${w.projectA2}/shares`)
      .set(sessions.engineerA.auth)
      .send({ userId: w.users.architectA.id, right: 'READ' });
    expect(res.status).toBe(403);
  });

  it('un partage reste borné à SON projet, pas aux autres', async () => {
    await server().post(`${API}/projects/${w.projectA2}/shares`).set(sessions.adminA.auth).send({ userId: w.users.architectA.id, right: 'EDIT' });
    // architectA est déjà affecté à projectA1 par ailleurs (buildWorld) : le partage sur A2 n'y change rien.
    const other = await server().get(`${API}/projects/${w.projectB}`).set(sessions.architectA.auth);
    expect(other.status).toBe(404);
  });
});
