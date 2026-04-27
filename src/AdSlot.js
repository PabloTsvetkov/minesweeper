import React, { useEffect } from 'react';
import { trackEvent } from './analytics';

const BLOCKS = {
  left:   'R-A-19172744-1',
  right:  'R-A-19172744-2',
  result: 'R-A-19172744-3',
};

function AdSlot({ placement, className = '' }) {
  const blockId = BLOCKS[placement];
  const containerId = `yandex_rtb_${blockId}`;

  useEffect(() => {
    if (!blockId || typeof window === 'undefined') return;

    window.yaContextCb = window.yaContextCb || [];
    window.yaContextCb.push(() => {
      if (window.Ya?.Context?.AdvManager) {
        window.Ya.Context.AdvManager.render({
          blockId,
          renderTo: containerId,
        });
      }
    });

    trackEvent('ad_visible', { placement });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!blockId) return null;

  return (
    <aside className={`ad-slot ${className}`} aria-label="Рекламный блок">
      <div id={containerId} />
    </aside>
  );
}

export default AdSlot;
