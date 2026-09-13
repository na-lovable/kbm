"use client";

import { useEffect, useRef, useState } from "react";

interface UseResponsivePanelsOptions {
  sidebarBreakpoint?: number;
  rightPanelBreakpoint?: number;
}

export function useResponsivePanels({
  sidebarBreakpoint = 1024,
  rightPanelBreakpoint = 1280,
}: UseResponsivePanelsOptions = {}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const userToggledSidebar = useRef(false);
  const userToggledRight = useRef(false);

  useEffect(() => {
    const syncPanelLayout = () => {
      const width = window.innerWidth;
      if (!userToggledSidebar.current) {
        setSidebarOpen(width >= sidebarBreakpoint);
      }
      if (!userToggledRight.current) {
        setRightOpen(width >= rightPanelBreakpoint);
      }
    };

    syncPanelLayout();
    window.addEventListener("resize", syncPanelLayout);
    return () => window.removeEventListener("resize", syncPanelLayout);
  }, [sidebarBreakpoint, rightPanelBreakpoint]);

  const collapseSidebar = () => {
    userToggledSidebar.current = true;
    setSidebarOpen(false);
  };

  const expandSidebar = () => {
    userToggledSidebar.current = true;
    setSidebarOpen(true);
  };

  const collapseRight = () => {
    userToggledRight.current = true;
    setRightOpen(false);
  };

  const expandRight = () => {
    userToggledRight.current = true;
    setRightOpen(true);
  };

  return {
    sidebarOpen,
    rightOpen,
    collapseSidebar,
    expandSidebar,
    collapseRight,
    expandRight,
  };
}
