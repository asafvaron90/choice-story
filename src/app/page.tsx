"use client";

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Listen for postMessage events from the iframe
    const handleMessage = (event: MessageEvent) => {
      // Log EVERYTHING coming in to see if we get *anything*
      console.log("STEP 5: Parent received message from:", event.origin);

      // Log all messages for debugging (remove in production if needed)
      console.log('Received postMessage:', event.data);

      if (event.data && event.data.action === "wix_button_clicked") {
        console.log("Success! The Wix button was clicked.");
        router.push('/dashboard');
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [router]);

  // Also try to detect iframe navigation by checking URL periodically
  // Note: This won't work due to CORS, but we'll keep it as a fallback attempt
  useEffect(() => {
    const checkIframeNavigation = () => {
      if (iframeRef.current) {
        try {
          // This will fail due to CORS, but we try anyway
          const iframeUrl = iframeRef.current.contentWindow?.location.pathname;
          if (iframeUrl && iframeUrl !== window.location.pathname) {
            router.push(iframeUrl);
          }
        } catch (_e) {
          // CORS error expected - ignore
        }
      }
    };

    // Check periodically (fallback method)
    const interval = setInterval(checkIframeNavigation, 1000);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
      <iframe
        ref={iframeRef}
        src="https://yaronloubaton.wixstudio.com/my-site-2"
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="External Content"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
      />
    </div>
  );
}
