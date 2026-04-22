import { useEffect } from 'react';

export default function TermsOfServicePage() {
  useEffect(() => {
    window.location.replace('https://cookslate.app/terms');
  }, []);
  return null;
}
