import { useEffect } from 'react';

const BASE_TITLE = 'Cookslate';

export default function useDocumentTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} — ${BASE_TITLE}` : BASE_TITLE;
    return () => { document.title = prev; };
  }, [title]);
}
