import { useEffect, useState } from 'react';

const QUERY = '(min-width: 1024px)';

/** Le concepteur d'architecture n'est pas conçu pour un petit écran (voir clé i18n desktopOnly). */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isDesktop;
}
