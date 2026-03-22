import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const CROP_SIZE = 280;
const MIN_SCALE = 0.3;
const MAX_SCALE = 5;

export default function ImageCropper({ imageSrc, onConfirm, onCancel }) {
  const imgRef = useRef(null);
  const cropRef = useRef(null);
  const [naturalDims, setNaturalDims] = useState(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, viewX: 0, viewY: 0 });
  const pinchRef = useRef(0);

  useEffect(() => { viewRef.current = view; }, [view]);

  const handleImageLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNaturalDims({ w, h });
    const s = CROP_SIZE / Math.min(w, h);
    const v = { scale: s, x: (CROP_SIZE - w * s) / 2, y: (CROP_SIZE - h * s) / 2 };
    setView(v);
    viewRef.current = v;
  };

  // Mouse drag
  const onMouseDown = (e) => {
    e.preventDefault();
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, viewX: viewRef.current.x, viewY: viewRef.current.y };
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragRef.current.active) return;
      const { startX, startY, viewX, viewY } = dragRef.current;
      setView(v => ({ ...v, x: viewX + e.clientX - startX, y: viewY + e.clientY - startY }));
    };
    const onMouseUp = () => { dragRef.current.active = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Wheel zoom + touch via ref (non-passive to allow preventDefault)
  useEffect(() => {
    const el = cropRef.current;
    if (!el) return;

    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.95 : 1.05;
      setView(v => {
        const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
        const r = ns / v.scale;
        const c = CROP_SIZE / 2;
        return { scale: ns, x: c - (c - v.x) * r, y: c - (c - v.y) * r };
      });
    };

    const onTouchStart = (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        dragRef.current = {
          active: true,
          startX: e.touches[0].clientX, startY: e.touches[0].clientY,
          viewX: viewRef.current.x, viewY: viewRef.current.y,
        };
      } else if (e.touches.length === 2) {
        dragRef.current.active = false;
        pinchRef.current = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    };

    const onTouchMove = (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && dragRef.current.active) {
        const { startX, startY, viewX, viewY } = dragRef.current;
        setView(v => ({
          ...v,
          x: viewX + e.touches[0].clientX - startX,
          y: viewY + e.touches[0].clientY - startY,
        }));
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const ratio = dist / (pinchRef.current || 1);
        pinchRef.current = dist;
        setView(v => {
          const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * ratio));
          const r = ns / v.scale;
          const c = CROP_SIZE / 2;
          return { scale: ns, x: c - (c - v.x) * r, y: c - (c - v.y) * r };
        });
      }
    };

    const onTouchEnd = () => { dragRef.current.active = false; };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  const handleConfirm = () => {
    if (!naturalDims) return;
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    const { x, y, scale } = viewRef.current;
    ctx.drawImage(imgRef.current, -x / scale, -y / scale, CROP_SIZE / scale, CROP_SIZE / scale, 0, 0, 600, 600);
    onConfirm(canvas.toDataURL('image/jpeg', 0.7));
  };

  return createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      width: '100vw', height: '100vh', zIndex: 99999,
      backgroundColor: 'rgba(0,0,0,0.92)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{ color: '#f0d070', fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
        Crop Your Photo
      </div>

      <div
        ref={cropRef}
        style={{
          width: CROP_SIZE, height: CROP_SIZE,
          position: 'relative', overflow: 'hidden', borderRadius: '8px',
          cursor: 'grab', touchAction: 'none', backgroundColor: '#111',
        }}
        onMouseDown={onMouseDown}
      >
        <img
          ref={imgRef}
          src={imageSrc}
          alt="Crop preview"
          onLoad={handleImageLoad}
          style={{
            position: 'absolute',
            left: view.x, top: view.y,
            width: naturalDims ? naturalDims.w * view.scale : 'auto',
            height: naturalDims ? naturalDims.h * view.scale : 'auto',
            maxWidth: 'none', userSelect: 'none', pointerEvents: 'none',
          }}
          draggable={false}
        />
        {/* Circular overlay */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: CROP_SIZE - 4, height: CROP_SIZE - 4,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
          border: '2px solid rgba(201,168,76,0.6)',
          pointerEvents: 'none',
        }} />
      </div>

      <div style={{ color: '#888', fontSize: '12px', marginTop: '8px' }}>
        Drag to pan &bull; Scroll to zoom
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
        <button onClick={onCancel} style={{
          background: 'rgba(100,100,100,0.4)', border: '1px solid #555',
          color: '#aaa', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer',
        }}>Cancel</button>
        <button onClick={handleConfirm} style={{
          background: 'rgba(15,66,37,0.9)', border: '1px solid rgba(201,168,76,0.4)',
          color: '#f0d070', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer',
        }}>Confirm</button>
      </div>
    </div>,
    document.body
  );
}
