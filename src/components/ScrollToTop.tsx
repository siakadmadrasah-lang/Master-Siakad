import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const ScrollToTop = () => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    // If there's an anchor hash, scroll to that element smoothly
    if (hash) {
      setTimeout(() => {
        const id = hash.replace("#", "");
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
          return;
        }
      }, 100);
    } else {
      // Otherwise immediately scroll window to top
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });
      // Also reset documentElement and body scroll
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }
    }
  }, [pathname, search, hash]);

  return null;
};

export default ScrollToTop;
