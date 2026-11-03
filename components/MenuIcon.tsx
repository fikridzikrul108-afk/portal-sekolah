import type { ReactNode } from "react";
import type { MenuIconName } from "@/lib/menu";

type Props = {
  name: MenuIconName;
  size?: number;
};

/**
 * Icon sederhana berbasis SVG agar komponen tidak bergantung pada library ikon
 * eksternal. Warna mengikuti currentColor dari elemen induk.
 */
export default function MenuIcon({ name, size = 20 }: Props) {
  let content: ReactNode;

  switch (name) {
    case "user":
      content = <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.7-3.1 3.2-5 7-5s6.3 1.9 7 5" /></>;
      break;
    case "students":
    case "teachers":
      content = <><path d="M16 21v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V21" /><circle cx="9" cy="7" r="4" /><path d="M16 3.5a4 4 0 0 1 0 7.8M18 15.5a4 4 0 0 1 4 4V21" /></>;
      break;
    case "dashboard":
      content = <><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="5" rx="1.5" /><rect x="13" y="10" width="8" height="11" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /></>;
      break;
    case "calendar":
      content = <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" /></>;
      break;
    case "report":
      content = <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>;
      break;
    case "journal":
      content = <><path d="M5 3h13a2 2 0 0 1 2 2v16H7a3 3 0 0 1-3-3V5a2 2 0 0 1 1-2z" /><path d="M4 17a3 3 0 0 1 3-3h13M8 7h8M8 10h6" /></>;
      break;
    case "remedial":
      content = <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.5-3" /></>;
      break;
    case "bk":
      content = <><path d="M20.8 8.8c0 5.2-8.8 11-8.8 11s-8.8-5.8-8.8-11A4.8 4.8 0 0 1 12 6.4a4.8 4.8 0 0 1 8.8 2.4z" /><path d="M8.5 12h2l1.2-2.2 1.8 4.4 1.2-2.2h1.8" /></>;
      break;
    case "attendance":
      content = <><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" /><rect x="9" y="2" width="6" height="4" rx="1" /><path d="m8 13 2.5 2.5L16 10" /></>;
      break;
    case "billing":
      content = <><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M3 9h18M7 15h4" /></>;
      break;
    case "settings":
      content = <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.6.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.6-.9l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.9l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.6-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.6.9l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.8z" transform="translate(-1 -1)" /></>;
      break;
    case "help":
      content = <><circle cx="12" cy="12" r="9" /><path d="M9.6 9a2.5 2.5 0 1 1 4.4 1.6c-1.2 1.1-2 1.5-2 3M12 17h.01" /></>;
      break;
    case "logout":
      content = <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>;
      break;
    case "menu":
      content = <><path d="M4 6h16M4 12h16M4 18h16" /></>;
      break;
    case "search":
      content = <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>;
      break;
    case "bell":
      content = <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>;
      break;
    case "sun":
      content = <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>;
      break;
    case "moon":
      content = <><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.8 8.8 0 1 0 20.5 14.2z" /></>;
      break;
    case "ai":
      content = <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" /></>;
      break;
    default:
      content = <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>;
  }

  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {content}
    </svg>
  );
}
