import { Body, Controller, Param, Post } from '@nestjs/common';
import type { AuthContext } from '@archiflow/shared';
import { z } from 'zod';
import { uuidParam } from '../../common/pipes/params';
import { zod } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser, RequirePermission } from '../../security/decorators';
import { ChatbotService } from './chatbot.service';

const messageSchema = z.object({ message: z.string().trim().min(1).max(500) });

/** Chatbot client (T9) — accès strictement limité aux données du projet, portée déjà appliquée (ADR 0006). */
@Controller('projects/:id/chat')
export class ChatbotController {
  constructor(private readonly chatbot: ChatbotService) {}

  @Post()
  @RequirePermission('chat.use')
  answer(@CurrentUser() ctx: AuthContext, @Param('id', uuidParam) id: string, @Body(zod(messageSchema)) body: z.infer<typeof messageSchema>) {
    return this.chatbot.answer(ctx, id, body.message);
  }

  @Post('escalate')
  @RequirePermission('chat.use')
  escalate(@CurrentUser() ctx: AuthContext, @Param('id', uuidParam) id: string, @Body(zod(messageSchema)) body: z.infer<typeof messageSchema>) {
    return this.chatbot.escalate(ctx, id, body.message);
  }
}
