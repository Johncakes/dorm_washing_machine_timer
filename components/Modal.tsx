"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  id?: string;
  labelledBy: string;
  children: ReactNode;
}

/**
 * Native <dialog> shown with showModal(): focus trapping, Esc to close and the
 * backdrop come from the browser. Clicking the backdrop also closes it, page
 * scrolling is locked while it is open, and focus returns to the opener.
 */
export function Modal({ open, onClose, id, labelledBy, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;

    if (!dialog) return;

    if (open && !dialog.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      document.body.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Unlock scrolling if the modal unmounts while open.
  useEffect(() => () => void (document.body.style.overflow = ""), []);

  const handleClose = () => {
    document.body.style.overflow = "";

    if (opener.current?.isConnected) opener.current.focus();
    onClose();
  };

  const handleClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = ref.current;

    if (!dialog || event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    const outside = event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;

    if (outside) dialog.close();
  };

  return (
    <dialog ref={ref} id={id} aria-labelledby={labelledBy} onClose={handleClose} onClick={handleClick}>
      {children}
    </dialog>
  );
}
