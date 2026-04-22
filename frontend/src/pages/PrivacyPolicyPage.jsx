import { useEffect } from 'react';

export default function PrivacyPolicyPage() {
  useEffect(() => {
    window.location.replace('https://cookslate.app/privacy');
  }, []);
  return null;
}
