{
  "design_system_name": "StudioFlow (Dark Studio Ops)",
  "brand_attributes": [
    "sleek studio control-room aesthetic",
    "traceable + audit-friendly",
    "fast scanning for queues",
    "calm surfaces, decisive accents",
    "agency-safe (multi-tenant clarity)"
  ],
  "inspiration_refs": {
    "product_vibes": [
      {
        "name": "Frame.io",
        "why": "media-first review/approval mental model; panel-based workspaces; precise feedback + versioning",
        "url": "https://frame.io/"
      },
      {
        "name": "Linear",
        "why": "dense list scanning, minimal chrome, crisp hierarchy, fast interactions",
        "url": "https://linear.app/"
      },
      {
        "name": "Notion",
        "why": "structured content blocks, calm typography, predictable spacing"
      }
    ],
    "dribbble_queries": [
      "dark creative ops dashboard",
      "video review dashboard dark",
      "status pill system dark ui",
      "frame io inspired dashboard"
    ]
  },
  "iconography": {
    "library": "lucide-react",
    "notes": "Use Lucide icons for all UI icons (bell, search, upload, chevrons). Avoid emoji icons."
  },
  "typography": {
    "google_fonts": {
      "display": {
        "family": "Space Grotesk",
        "weights": ["500", "600", "700"],
        "usage": "Page titles, section headers, KPI numbers, status headers"
      },
      "body": {
        "family": "Figtree",
        "weights": ["400", "500", "600"],
        "usage": "Tables, forms, long descriptions, comments"
      },
      "mono": {
        "family": "IBM Plex Mono",
        "weights": ["400", "500"],
        "usage": "IDs, file names, version tags, timestamps"
      }
    },
    "tailwind_mapping": {
      "font_display": "font-[var(--font-display)]",
      "font_body": "font-[var(--font-body)]",
      "font_mono": "font-[var(--font-mono)]"
    },
    "type_scale": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight",
      "h2": "text-xl sm:text-2xl font-semibold tracking-tight",
      "h3": "text-lg font-semibold",
      "body": "text-sm md:text-base leading-relaxed",
      "meta": "text-xs text-muted-foreground",
      "table": "text-sm leading-snug",
      "pill": "text-xs font-medium tracking-wide"
    },
    "copy_rules": [
      "Prefer short, operational labels: 'Pending script review', 'Assigned to agency', 'Final rejected'.",
      "Use sentence case for buttons and headings.",
      "Use tabular numerals for timestamps and counts where possible (Tailwind: tabular-nums)."
    ]
  },
  "color_system": {
    "mode": "dark-first",
    "gradient_policy": {
      "allowed": "Only subtle decorative overlays in hero/empty states; never on reading surfaces; never >20% viewport.",
      "prohibited": "No saturated purple/pink/blue-to-purple gradients; no gradients on small UI elements (<100px)."
    },
    "tokens_css_variables": {
      "notes": "These override current shadcn defaults in index.css. Keep HSL tokens for shadcn compatibility.",
      "dark": {
        "--background": "215 35% 6%",
        "--foreground": "210 40% 98%",
        "--card": "215 30% 9%",
        "--card-foreground": "210 40% 98%",
        "--popover": "215 30% 9%",
        "--popover-foreground": "210 40% 98%",
        "--primary": "173 80% 40%",
        "--primary-foreground": "210 40% 98%",
        "--secondary": "215 22% 14%",
        "--secondary-foreground": "210 40% 98%",
        "--muted": "215 18% 16%",
        "--muted-foreground": "215 15% 70%",
        "--accent": "215 22% 14%",
        "--accent-foreground": "210 40% 98%",
        "--destructive": "0 78% 60%",
        "--destructive-foreground": "210 40% 98%",
        "--border": "215 18% 22%",
        "--input": "215 18% 22%",
        "--ring": "173 80% 40%",
        "--radius": "0.75rem"
      },
      "extended_custom_tokens_hex": {
        "bg_0": "#0A0F14",
        "bg_1": "#111827",
        "bg_2": "#17212B",
        "stroke": "#2B3744",
        "text_1": "#F4F7FB",
        "text_2": "#C7D2E0",
        "text_3": "#8FA1B3",
        "brand_teal": "#14B8A6",
        "brand_teal_hover": "#0F9F91",
        "info_cyan": "#22D3EE",
        "success_lime": "#84CC16",
        "warning_amber": "#F59E0B",
        "danger_red": "#F87171",
        "focus_ring": "#2DD4BF",
        "selection": "rgba(20,184,166,0.22)",
        "shadow_rgba": "rgba(0,0,0,0.55)"
      },
      "status_palette": {
        "draft": { "bg": "rgba(143,161,179,0.14)", "text": "#C7D2E0", "border": "rgba(143,161,179,0.28)" },
        "pending_script_review": { "bg": "rgba(34,211,238,0.14)", "text": "#7DEBFF", "border": "rgba(34,211,238,0.30)" },
        "script_rejected": { "bg": "rgba(248,113,113,0.14)", "text": "#FFB4B4", "border": "rgba(248,113,113,0.30)" },
        "assigned_agency": { "bg": "rgba(20,184,166,0.14)", "text": "#6EF3E6", "border": "rgba(20,184,166,0.30)" },
        "assigned_editor": { "bg": "rgba(20,184,166,0.10)", "text": "#B7FFF7", "border": "rgba(20,184,166,0.22)" },
        "pending_final_review": { "bg": "rgba(245,158,11,0.14)", "text": "#FFD08A", "border": "rgba(245,158,11,0.30)" },
        "final_rejected": { "bg": "rgba(248,113,113,0.14)", "text": "#FFB4B4", "border": "rgba(248,113,113,0.30)" },
        "approved": { "bg": "rgba(132,204,22,0.14)", "text": "#D7FF9A", "border": "rgba(132,204,22,0.30)" }
      }
    }
  },
  "spacing_radius_shadow_tokens": {
    "spacing": {
      "rule": "Use 2–3x more whitespace than typical admin templates. Prefer 24–32px section padding.",
      "page_padding": "px-4 sm:px-6 lg:px-8",
      "section_gap": "gap-6 lg:gap-8",
      "card_padding": "p-4 sm:p-5",
      "dense_row_padding": "py-2.5 px-3"
    },
    "radius": {
      "app": "rounded-2xl for major shells",
      "card": "rounded-xl",
      "control": "rounded-lg",
      "pill": "rounded-full"
    },
    "shadows": {
      "philosophy": "In dark mode, rely on borders + subtle elevation; avoid heavy drop shadows.",
      "tokens": {
        "shadow_1": "0 1px 0 rgba(255,255,255,0.04) inset, 0 10px 30px rgba(0,0,0,0.35)",
        "shadow_2": "0 1px 0 rgba(255,255,255,0.05) inset, 0 18px 50px rgba(0,0,0,0.45)"
      }
    }
  },
  "layout_and_grid": {
    "app_shell": {
      "pattern": "Left sidebar + top bar + content area with optional right inspector panel on detail pages.",
      "desktop_grid": "Sidebar 280px fixed; content max-w-[1400px] with fluid width; optional inspector 360px.",
      "mobile": "Sidebar collapses into Sheet; top bar remains; lists become single-column cards.",
      "topbar": {
        "left": "Breadcrumb + page title",
        "center": "Search (Command palette style)",
        "right": "Notification bell with unread badge + user avatar dropdown"
      }
    },
    "page_templates": {
      "queue_list": {
        "structure": "Header (filters + sort + bulk actions) -> scannable list/table -> right-side quick preview on xl.",
        "notes": "Queues should default to 'My items' and show counts per status."
      },
      "detail_review": {
        "structure": "Two-column: left = brief/script/comments; right = media player + versions. On xl add sticky action bar.",
        "sticky_actions": "Approve / Reject / Assign should be sticky at bottom on desktop; on mobile use fixed bottom bar."
      },
      "admin_crud": {
        "structure": "Table with toolbar (search, filters, create button) + right-side Drawer for create/edit."
      },
      "downloads_gallery": {
        "structure": "Masonry-like grid of approved ads (video thumbnail + headline + primary text) with download CTA.",
        "notes": "Keep text readable; clamp to 2–3 lines; show copy buttons."
      }
    }
  },
  "components": {
    "component_path": {
      "shadcn_primary": "/app/frontend/src/components/ui",
      "use_only_note": "Use shadcn components for dropdowns, dialogs, sheets, calendar, tables, etc. Do not use raw HTML equivalents."
    },
    "shadcn_components_to_use": {
      "navigation": ["navigation-menu.jsx", "breadcrumb.jsx", "tabs.jsx", "menubar.jsx"],
      "shell": ["sheet.jsx", "scroll-area.jsx", "separator.jsx", "resizable.jsx"],
      "data_display": ["table.jsx", "card.jsx", "badge.jsx", "progress.jsx", "skeleton.jsx", "tooltip.jsx"],
      "forms": ["form.jsx", "input.jsx", "textarea.jsx", "select.jsx", "checkbox.jsx", "radio-group.jsx", "switch.jsx"],
      "overlays": ["dialog.jsx", "drawer.jsx", "popover.jsx", "dropdown-menu.jsx", "alert-dialog.jsx"],
      "utilities": ["command.jsx", "avatar.jsx", "aspect-ratio.jsx", "carousel.jsx"],
      "notifications": ["sonner.jsx"],
      "date": ["calendar.jsx"]
    },
    "custom_components_to_create": [
      {
        "name": "AppSidebar",
        "purpose": "Role-based nav with grouped sections + agency context chip",
        "key_states": ["collapsed", "expanded", "active route", "role switch (admin only)"]
      },
      {
        "name": "TopBar",
        "purpose": "Search/command, notifications, user menu",
        "key_states": ["search focused", "unread badge", "offline banner (optional)"]
      },
      {
        "name": "StatusPill",
        "purpose": "Single source of truth for all workflow statuses",
        "props": ["status", "size=sm|md", "withDot", "interactive"],
        "notes": "Must be used everywhere statuses appear (tables, cards, detail headers)."
      },
      {
        "name": "QueueRow",
        "purpose": "Scannable row with primary label, meta, status, and primary action",
        "notes": "Row hover reveals quick actions (assign, open, approve)."
      },
      {
        "name": "MediaPanel",
        "purpose": "Video player + version history + upload",
        "notes": "Use AspectRatio + Card; show upload progress + version list."
      },
      {
        "name": "CommentThread",
        "purpose": "Review comments with timestamps + role badges",
        "notes": "Use ScrollArea; support @mentions later; keep dense but readable."
      },
      {
        "name": "NotificationCenter",
        "purpose": "Bell dropdown/panel with unread grouping",
        "notes": "Use Popover or Sheet on mobile; include 'Mark all read'."
      }
    ],
    "buttons": {
      "style": "Professional / studio sleek",
      "variants": {
        "primary": {
          "use": "Approve, Assign, Create",
          "tailwind": "bg-[var(--brand-teal)] text-white hover:bg-[var(--brand-teal-hover)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
          "motion": "hover: translateY(-1px) + subtle glow"
        },
        "secondary": {
          "use": "Neutral actions",
          "tailwind": "bg-[color:var(--bg-2)] text-[color:var(--text-1)] border border-[color:var(--stroke)] hover:bg-[color:var(--bg-1)]"
        },
        "ghost": {
          "use": "Row actions, icon buttons",
          "tailwind": "bg-transparent hover:bg-white/5 text-[color:var(--text-2)]"
        },
        "danger": {
          "use": "Reject, Delete",
          "tailwind": "bg-[color:rgba(248,113,113,0.16)] text-[color:#FFB4B4] border border-[color:rgba(248,113,113,0.30)] hover:bg-[color:rgba(248,113,113,0.22)]"
        }
      },
      "sizes": {
        "sm": "h-8 px-3 text-sm",
        "md": "h-9 px-4 text-sm",
        "lg": "h-10 px-5 text-base"
      },
      "rules": [
        "Never use transition: all. Use transition-colors and transition-shadow only.",
        "Always include visible focus ring (focus-visible:ring-2).",
        "All buttons must include data-testid."
      ]
    },
    "inputs": {
      "base": "bg-[color:var(--bg-1)] border border-[color:var(--stroke)] text-[color:var(--text-1)] placeholder:text-[color:var(--text-3)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
      "search": "Use Command component for global search; show recent items + quick actions.",
      "file_upload": "Use a Card dropzone with dashed border + hover highlight; show file chips + progress."
    },
    "tables_and_lists": {
      "default": "Prefer Table for admin CRUD; prefer list rows for queues.",
      "row_behavior": [
        "Row hover: bg-white/3",
        "Selected row: bg-[var(--selection)]",
        "Quick actions appear on hover (opacity transition-colors only)"
      ],
      "density": "Default dense; allow 'Comfortable' toggle later."
    },
    "status_pills": {
      "visual": "Pill with subtle tinted background + 1px border + optional dot.",
      "tailwind_base": "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium",
      "dot": "w-1.5 h-1.5 rounded-full",
      "mapping": "Use status_palette tokens; never hardcode colors in pages.",
      "data_testid": "data-testid=\"status-pill\" plus a suffix like status-pill-approved"
    },
    "media": {
      "player": "Use native <video controls> inside AspectRatio; wrap in Card; show metadata (duration, resolution) as muted text.",
      "gallery": "Reference media grid: 3 columns desktop, 2 tablet, 1 mobile; each item opens Dialog with preview.",
      "version_history": "Use Accordion or Collapsible list; each version row shows uploader, timestamp, notes, download."
    },
    "modals_drawers": {
      "assign_modal": "Use Dialog with two-step: choose agency -> choose assignee/editor; show capacity hints.",
      "create_edit": "Use Drawer on mobile, Dialog on desktop; keep primary action sticky in footer.",
      "review_reject": "Reject requires comment textarea; show character count; confirm destructive action."
    },
    "notifications": {
      "bell": "IconButton with Badge unread count (max 99+).",
      "center": "Popover on desktop; Sheet on mobile; group by Today/This week; include Mark all read.",
      "toast": "Use Sonner for ephemeral confirmations (uploaded, assigned, approved)."
    },
    "empty_loading_error_states": {
      "empty": [
        "Use calm empty cards with 1-line explanation + primary CTA.",
        "Optional subtle decorative gradient overlay (<=20% viewport) + noise texture.",
        "Examples: 'No ads pending review' + 'View all ad sets'."
      ],
      "loading": [
        "Use Skeleton rows for queues and tables.",
        "For media upload: show progress bar + percent + ETA placeholder."
      ],
      "error": [
        "Use Alert component with clear next step.",
        "Inline field errors under inputs; keep copy actionable."
      ]
    }
  },
  "motion_and_microinteractions": {
    "library": "framer-motion (already installed)",
    "principles": [
      "Motion should communicate state change (assigned, approved, uploaded) not decoration.",
      "Keep durations short: 120–180ms for hover; 180–240ms for panel transitions.",
      "Respect prefers-reduced-motion."
    ],
    "patterns": {
      "row_hover": "On hover: subtle background lift + reveal quick actions (opacity).",
      "panel_enter": "Dialogs/Sheets: fade + slight translateY(6px).",
      "status_change": "Status pill briefly pulses (scale 1.02 -> 1.0) on update.",
      "upload": "Progress bar animates width; success check fades in."
    },
    "do_not": [
      "Do not use universal transition: all.",
      "Avoid large parallax in dashboards; keep it subtle (1–2px) if used at all."
    ]
  },
  "accessibility": {
    "requirements": [
      "WCAG AA contrast for text and key UI.",
      "Visible focus states on all interactive elements.",
      "Keyboard navigable menus, dialogs, command palette.",
      "Use aria-label for icon-only buttons (bell, upload, download)."
    ],
    "testing": {
      "data_testid_rule": "All interactive and key informational elements MUST include data-testid in kebab-case describing role.",
      "examples": [
        "data-testid=\"login-form-submit-button\"",
        "data-testid=\"topbar-notification-bell-button\"",
        "data-testid=\"script-review-approve-button\"",
        "data-testid=\"video-upload-dropzone\"",
        "data-testid=\"status-pill-approved\"",
        "data-testid=\"agency-assign-editor-select\""
      ]
    }
  },
  "page_specific_guidance": {
    "login": {
      "layout": "Split-screen: left brand panel (subtle texture), right login card.",
      "details": [
        "Use Card with minimal fields.",
        "Show 'Forgot password' as muted link.",
        "Primary CTA: Sign in."
      ]
    },
    "creator_ad_set_create": {
      "pattern": "Wizard using Tabs or Stepper-like header (custom) + sticky footer actions.",
      "script_only": "Script editor (Textarea) + reference media upload + guidelines fields.",
      "media_ready": "Video upload first + metadata + headline/primary text."
    },
    "script_reviewer_queue": {
      "pattern": "Queue list with filters (status, agency, due date) + bulk actions.",
      "detail": "Per-ad cards with script, reference links preview, and approve/assign modal."
    },
    "agency_admin_assignment": {
      "pattern": "Assigned ad sets list -> inside: per-ad dropdown assign to editor; bulk assign at top.",
      "notes": "Always show agency context chip in header to prevent cross-agency confusion."
    },
    "video_editor": {
      "pattern": "My assigned ads list -> brief detail -> upload + version history.",
      "notes": "Show 'Latest version' badge and 'Submitted' timestamp."
    },
    "final_reviewer": {
      "pattern": "Side-by-side: media player left, brief/comments right; approve/reject sticky.",
      "notes": "Reject requires comment; show previous rejection notes."
    },
    "approved_downloads": {
      "pattern": "Gallery grid with video thumbnail + copyable headline/text + download button.",
      "notes": "Provide 'Copy headline' and 'Copy primary text' ghost buttons."
    }
  },
  "additional_libraries": {
    "recommended": [
      {
        "name": "react-dropzone",
        "why": "Better drag/drop UX for local file uploads",
        "install": "npm i react-dropzone",
        "usage_notes": "Wrap dropzone in Card; show accepted file types; add data-testid=\"video-upload-dropzone\"."
      },
      {
        "name": "react-player (optional)",
        "why": "If you need consistent playback controls across browsers; otherwise native <video> is fine",
        "install": "npm i react-player",
        "usage_notes": "Use only if native player limitations appear; keep UI minimal."
      }
    ]
  },
  "image_urls": {
    "note": "Image provider tool failed in this environment. Use these safe, production-friendly placeholders until assets are sourced.",
    "categories": [
      {
        "category": "login_brand_panel_background",
        "description": "Subtle studio/desk texture background (dark, low contrast).",
        "urls": [
          "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1600&q=60",
          "https://images.unsplash.com/photo-1527443154391-507e9dc6c5cc?auto=format&fit=crop&w=1600&q=60"
        ]
      },
      {
        "category": "empty_state_illustration_optional",
        "description": "Abstract dark shapes / subtle grain (avoid loud gradients).",
        "urls": [
          "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&w=1600&q=60"
        ]
      }
    ]
  },
  "implementation_notes_for_js_react": {
    "notes": [
      "Project uses .js (not .tsx). Keep components in JS and use PropTypes if needed.",
      "Set dark mode class on <html> or <body> (className='dark') as default.",
      "Replace CRA demo styles in App.css; do not center the app container.",
      "Prefer shadcn components from /src/components/ui for all primitives.",
      "Use Sonner for toasts (already present)."
    ],
    "data_testid_convention": {
      "format": "kebab-case",
      "examples": [
        "ad-set-create-primary-button",
        "script-review-reject-textarea",
        "agency-assign-bulk-button",
        "notification-center-mark-all-read-button"
      ]
    }
  },
  "instructions_to_main_agent": [
    "Update /app/frontend/src/index.css tokens: set dark palette as default and ensure .dark is applied at app root.",
    "Create a single StatusPill component that maps backend statuses to semantic styles; use it everywhere.",
    "Build the app shell first (Sidebar + TopBar + NotificationCenter) and then implement role dashboards as focused queue/list templates.",
    "Use Table for admin CRUD; use list rows/cards for queues; keep actions right-aligned and consistent.",
    "Implement media panels with AspectRatio + Card; include version history and upload progress.",
    "Add data-testid to every interactive element and key info label/value (counts, statuses, errors)."
  ],
  "general_ui_ux_design_guidelines_appendix": "<General UI UX Design Guidelines>  \n    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.\n</General UI UX Design Guidelines>"
}
