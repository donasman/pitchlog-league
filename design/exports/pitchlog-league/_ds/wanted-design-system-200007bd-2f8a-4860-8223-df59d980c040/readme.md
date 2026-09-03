# Wanted Design System

A recreation of **Wanted Design System** — the open-source (CC BY 4.0) product design library published by Wanted Lab for the Wanted job platform and its sub-services (Wanted, Wanted Gigs, Wanted Space, Wanted Agent, LaaS, Wanted OneID).

The system is Korean-first: every component ships with Korean sample copy, and the type scale is tuned for Hangul set in Pretendard JP.

## Sources

- **Figma:** `Wanted Design System (Community).fig`, mounted as a read-only virtual filesystem for this build. 26 pages, 101,532 nodes, 770 component sets, 488 Figma Variables. Credited in the file: Design — Hyungjin Kil, Chaeri Oh, Doeun Kim, Sanghyo Yee, Kyungmin Park, Sungho Cho, Jisoo Lee. File dated 2025-11-06, distributed under CC BY 4.0.
- No codebase, repository or slide deck was provided.
- Fonts are not embedded in the .fig; both are loaded from their official open-source CDN builds (see *Typography*).

## Products represented

| Surface | What the file shows |
| --- | --- |
| Wanted mobile app (iOS / Android) | Status bar, top navigation, bottom navigation, home bar, job cards, list cells, action areas |
| Wanted web | Desktop top navigation, job grid, filter rail, pagination, menus, tooltips |
| Sub-service brands | Logotypes only — Gigs, Space, Agent, LaaS, OneID. No screens. |

---

## Content fundamentals

**Language.** Korean is the primary voice; English appears as a parallel label in documentation ("Action Area" / "사용자가 인터페이스를 통해 상호작용할 수 있는 공간을 제공합니다."), never as the product voice. Component names, variant names and token names are English; all user-facing strings are Korean.

**Register.** Polite declarative 합니다체. Descriptions state what a thing does, in one sentence, without hedging: "사용자가 인터페이스를 통해 상호작용할 수 있는 공간을 제공합니다."

**Person.** The product speaks in the imperative to the user, not about itself: "지원하기", "더 보기", "선택하세요", "텍스트를 편집할 수 있도록 아래 폰트를 설치하세요". First person is reserved for the design team's own notes in the Overview page ("오픈 소스는 우리가 일하는 환경을 더욱 풍요롭고 생산적으로 만들어주는 핵심이라고 믿습니다").

**Button copy** is a bare verb phrase ending in -하기 or a noun: 지원하기 · 더 보기 · 취소 · 확인. Never a full sentence, never punctuation.

**Casing.** English UI strings use Title Case for component and variant labels, sentence case for prose. Korean has no casing, so hierarchy is carried entirely by weight and size.

**Numbers** are written with thousands separators and a Korean unit: "합격보상금 1,000,000원", "1,284건".

**Emoji: none.** The file contains no emoji in any UI string. Status is carried by icon + colour, never by a glyph from the emoji set.

**Vibe.** Plain, dense, informational. It reads like a well-run job board: no exclamation marks, no marketing adjectives inside components, no personality copy. Warmth comes from the imagery and the blue, not from the words.

---

## Visual foundations

**Colour.** One brand accent — Wanted blue, `--primary-normal` `rgb(51,102,255)` in the Theme collection (the Atomic ramp's Blue 50 is `rgb(0,102,255)`; both appear, and components reference the semantic token). Everything else is a cool neutral ramp (`--cool-neutral-5` → `--cool-neutral-99`, hue-shifted very slightly blue: 112,115,124 at mid-grey). Status is a three-note set: positive green `--status-positive`, cautionary orange, negative red `rgb(255,66,66)`. A wider categorical accent palette (violet, purple, pink, red-orange, lime, cyan, light-blue) exists strictly as foreground/background pairs for tags and category chips — never as UI chrome.

Labels and lines are **alpha over neutral**, not solid greys: `--label-normal` is opaque, but `--label-alternative` is `rgba(55,56,60,.61)`, `--label-assistive` `.28`, `--label-disable` `.16`; `--line-normal-normal` is `rgba(112,115,124,.22)`. This is why the system composes over photography without recolouring.

Two full themes ship (Light / Dark) plus platform modes (Mobile / Desktop) and size modes, all as Figma Variable modes; they are emitted as `:root` and `:root[data-theme="dark"]` / `[data-mode="…"]` scopes in `tokens/fig-tokens.css`.

**Type.** Pretendard JP for everything in-product; Wanted Sans only for the logotype and a handful of brand marks. Nineteen named styles across five tiers — Display, Title, Heading/Headline, Body, Label/Caption — with letter-spacing that moves negative as size grows (-0.0319em at 56px) and positive as size shrinks (+0.0311em at 11px). Weight is the second axis: Bold 700 for Display and Title, SemiBold 600 for Heading and Headline, Medium 500 for Body and Label, Regular 400 for the "Reading" line-height variants. There is no italic and no serif.

**Spacing.** A 2/4/6/8/10/12/16/20/24/32/40/48/64 rhythm. Note the 6px and 10px steps — the system is *not* on a strict 8pt grid, and component paddings carry values like 12px 28px. Copy the numbers as written.

**Corner radii.** 4 · 8 · 12 · 16 · 20 · 24, plus full pills. Cards and buttons land on 12; sheets and modals on 16–24; chips and avatars are fully round. There is a Squircle mask in the file for the app icon, but product surfaces use plain `border-radius`.

**Cards** are a white (`--background-elevated-normal`) rectangle at radius 12 with either a **1px inset hairline** `inset 0 0 0 1px rgba(112,115,124,.22)` or nothing at all. Drop shadows are reserved for things that float: `0 1px 2px rgba(0,0,0,.08)` for raised, `0 4px 12px rgba(0,0,0,.08)` for overlays, `0 8px 24px rgba(0,0,0,.12)` for modals. The most-used shadow in the whole file is `rgba(0,0,0,0.08)` — the system is deliberately flat.

**Backgrounds.** Flat colour, never gradient, with exactly two page tones: `--background-normal-normal` (white) and `--background-normal-alternative` (`rgb(247,247,248)`). Full-bleed photography appears only inside Thumbnail and Card. Where text sits on an image, the system uses a **protection gradient** (`Gradient/Solid`, a solid-colour ramp to transparent, e.g. `rgb(32,85,166)` over a 72px band) plus a 1px text shadow — not a capsule or scrim card. There are no illustrations, patterns or textures in the file.

**Transparency and blur.** Alpha is used constantly for labels, fills and lines. Blur is used only for the iOS-style navigation and status bars and for `Decorate/Dimmer`; there is no decorative glassmorphism.

**Interaction states** are their own components — `Decorate/Interaction` in Light / Normal / Strong, each with a 4-state variant axis. They paint a translucent neutral overlay on top of the target rather than swapping its background colour: hover and press *darken* by adding `rgba(112,115,124, …)`, they do not lighten. Disabled is a token swap (`--interaction-disable`, `--label-disable`), not opacity on the whole element. Nothing scales or bounces on press.

**Motion.** The file specifies almost none: the only animated components are `Circular/Circular` and `Circular/Wanted` (indeterminate spinners) and the skeleton shimmer, each exposed as a boolean `animate` variant. Treat transitions as short and linear — fades and opacity, no springs.

**Imagery** is warm, naturalistic photography of people and workplaces at normal saturation — no grain, no duotone, no b&w treatment. Company and school avatars are square logos on a light plate; person avatars are circular photos.

**Layout.** Mobile screens are 16px side margins with fixed `Status Bar` / `Top Navigation` at the top and `Bottom Navigation` / `Home Bar` pinned to the bottom. Desktop uses a centred max-width container with a fixed 60px header. `Safe Area` and `Spacing/Bottom Safe Area` are real components, not CSS afterthoughts.

---

## Iconography

- **One in-house set, ~211 glyphs**, drawn as filled/stroked 24px vectors and organised as `Icon/Normal/<Name>`, `Icon/Navigation/<Name>` (5 tab glyphs) and `Icon/Color/<Logo>` (9 full-colour third-party marks: Apple, Facebook, Google, Google Play, Instagram, Kakao, LinkedIn, Naver Blog, YouTube).
- Many glyphs carry a **`Fill` boolean** (outline vs filled — filled means active/selected) and some carry **`Thick`**, **`Tight`** and **`Small`** booleans for optical variants. The chevrons in particular exist in Tight/Thick/Small combinations; pick the one the layout calls for rather than scaling.
- Single-colour icons paint with `currentColor`, so they inherit the label token they sit next to.
- **No icon font, no sprite sheet, no CDN library.** Everything is extracted from the file into `components/icons/icon-data.js`; render with `<Icon name="…" size={24} />`. `components/icons/Icon.d.ts` is the name index.
- **No emoji, no unicode-as-icon** anywhere in the source.
- Logos live in `assets/logos/` as SVG: Wanted wordmark and symbol, plus Agent / Gigs / Space / LaaS logotypes. Sub-service logotypes are monochrome and inherit `currentColor`.

---

## What is in this project

| Path | What it is |
| --- | --- |
| `styles.css` | The single entry point consumers link. `@import` list only. |
| `tokens/fig-tokens.css` | All 488 Figma Variables across 6 collections and every mode (Light, Dark, Mobile, Desktop, size modes). |
| `tokens/typography.css` | The 19-style type scale as custom properties + `.wds-*` classes. |
| `tokens/fonts.css` | `@font-face` sources for Pretendard JP and Wanted Sans. |
| `tokens/aliases.css` | Conventional aliases (`--text-body`, `--surface-card`, radii, spacing) over the Figma names, plus default link colours. |
| `components/core/` | 258 React components materialised from the file, each with a `.d.ts` props contract. |
| `components/icons/` | `icon-data.js` (211 glyphs) + `Icon.jsx` wrapper + `Icon.d.ts` name index. |
| `guidelines/` | Foundation specimen cards (colour, type, spacing, radius, elevation). |
| `assets/logos/` | Wanted wordmark, symbol and sub-service logotypes as flat SVG. |
| `components/logos/` | The same lockups as React components, in every colourway the file defines. |
| `ui_kits/wanted-jobs/` | Click-through recreation: mobile discovery → job detail, plus the desktop job list. |
| `templates/wanted-jobs/` | The same two surfaces as a copyable Design Component template for consuming projects. |
| `SKILL.md` | Agent Skills front-matter so this folder works in Claude Code. |

## Extraction repairs

The .fig import is faithful on values but loses a few Figma constructs (masks, hug
widths, nested-instance defaults). These were found by rendering every card and
repaired at the source; each is a deliberate edit, not an import artifact:

| What was wrong | Where | Fix |
| --- | --- | --- |
| Scroll-fade **masks painted as solid black**, covering the whole element | `TabTab`, `CategoryCategory`, `GradientMask` | Mask middle set transparent; edge fades recoloured to `--background-normal-normal` → transparent, so they read as real protection gradients |
| Icon wrappers painted a **solid colour plate over the glyph** (the plate is masked *by* the glyph in Figma) | `IconIcons`, `IconIcons2`, `IconIconsResponsive` | Plate removed — the glyph already paints with `currentColor` |
| Thumbnail image plane extracted as a rect filled with `currentColor`, so it inherited the page text colour and rendered **near-black** | `ThumbnailThumbnail` | Filled with `--fill-normal` (the design's empty-image grey) |
| Components **defaulted to their disabled variant** — `disable ?? true` — so text buttons and menu cells rendered grey unless told otherwise | `ButtonText`, `ButtonText2`, `ButtonText3`, `MenuResourceItemCell` | Defaults flipped to `false`; the unmatched-variant fallback now resolves to the first body instead of a disabled one |
| Switch **track collapsed to a circle** — the fixed track width was emitted as hug-content | `ControlSwitch` | Track restored to 52px (md) / 39px (sm), knob parked per on/off state |
| Toast status-icon wrapper **collapsed to 0px wide**, dropping the icon on top of the text | `ToastToast` | Wrapper restored to its 22px box |
| Hover/press overlays **frozen at their 64×64 artboard**, showing as a small square floating over inputs and cells | `InteractionNormal`, `InteractionLight` | Stretched to fill their parent |
| Tab label **wrapped onto two lines** — the measured hug width (45px) is ~1px narrower than the webfont renders | `TabResourceTab` | Hugs for real (`width:auto`, `min-width:45px`, `nowrap`) |
| Wanted symbol extracted as a **filled rectangle** (mask lost) | `LogoResourceAssetSymbol*`, `LogoCircleWantedSymbol*` | Real path inlined from `assets/logos/wanted-symbol.svg` |
| Figma's **aspect-ratio guide** — a dashed diagonal labelled "Ratio" — was emitted as real UI. It painted dotted diagonals across every thumbnail and card, leaked the literal text "Ratio" into Select's value slot, and pinned a fixed 100px box onto everything that used it (avatars, cards) | `Ratio`, `RatioHorizontal` (17 variants), `RatioVertical`, `RatioVertical2`, `RatioVertical3`, `RatioVertical4` | Rewritten as what the guide *means*: an invisible `aspect-ratio` box, no border and no text |
| Field **border / focus-ring layer frozen at its 64×64 artboard**, so it drew a small box over each input's left edge and left the chevron looking detached | `TextinputResourceInteraction` | Stretched to `inset:0` so it tracks the field |
| Thumbnail **fill plate, border and overlay baked at 240×240**, overflowing whenever a card stretched the thumbnail | `ThumbnailThumbnail` | Layers stretched to `inset:0`; the fixed-size SVG plate replaced by a `--fill-normal` div |

### Known remaining fidelity gaps

- **Logo colourways.** The `- White` / `- Light` / `- Dark` lockups all carry the Black
  artwork; those variants recolour through a nested-instance fill override the extractor
  does not resolve. The paths honour `currentColor`, so set `color` on the wrapper, or use
  the flat SVGs in `assets/logos/`.
- **Fixed-geometry components do not reflow.** Lockups, mobile bars (400×57 / 400×71),
  status bars and the 375-wide modal frames are absolute-positioned boxes. Scale them
  inside a sized wrapper rather than setting `width`/`height` directly — see
  `components/logos/README.md` for the recipe.
- **Long labels overflow buttons.** `ButtonButton` is sized to its Figma label; a longer
  string clips rather than growing the pill.
- **`loading` keeps the label node**, so a spinner lands on top of the text. Render
  loading buttons label-less at a fixed width.
- **No thick-vertical divider** exists in the source; only `variant="normal"` has a
  vertical form.
- **Figma text styles are not styles.** `fig-typography.css` is empty — the file defines
  its type inline, so the scale in `tokens/typography.css` was transcribed by hand from
  the Typography page (19 named styles, with the tracking that crosses zero at 17px).
  Extracted components carry raw `font-size`/`font-weight` and no `letter-spacing`; apply
  a `.wds-*` class when tracking matters.

## Components

**`components/core/`** — 396 components, each with a sibling `.d.ts` props contract and a `.prompt.md` usage note:

ActionAreaActionArea · ActionAreaResourceActions · ActionAreaResourceCompactPreset · ActionAreaResourceExtraPreset · AgentAlt3 · AlertAlert · AlertAlertWebDesktop · AlertResourceAction · AlertResourceDialog · ArrowWithTexts · ArrowWithTextsAlgorithm · AutoCompleteAutoComplete · AutoCompleteResourceItemAction · AutoCompleteResourceItemCell · AutoCompleteResourceItemTitle · AvartarResourcePlaceholderPerson · AvatarAcademic · AvatarAvatar · AvatarAvatarGroup · AvatarCompany · AvatarPerson · AvatarPersonXSmallIcon · AvatarResourceAvatarGroupTrailing · AvatarResourceImageAcademic · AvatarResourceImageAcademy · AvatarResourceImageCompany · AvatarResourceImageCompany2 · AvatarResourceImageCompany3 · AvatarResourceImagePerson · AvatarResourceImagePerson2 · AvatarResourceImagePerson3 · AvatarResourcePlaceholderAcademic · AvatarResourcePlaceholderAcademy · AvatarResourcePlaceholderCompany · AvatarResourcePlaceholderCompany2 · AvatarResourcePlaceholderPerson · AvatarResourcePlaceholderPerson2 · Badge · BadgePush · BadgePush2 · BadgeStatus · BadgeValue · BasicDivider · Blank · Bookmark · BottomNavigationBottomNavigation · BottomNavigationResourceContent · BottomNavigationResourceTabAndroid · BottomNavigationResourceTabIOS · BottomNavigationResourceTabWeb · Bubble · BusinessBag · ButtonButton · ButtonFloatingActionButton · ButtonIconBackground · ButtonIconButtonBackground · ButtonIconButtonNormal · ButtonIconButtonOutlined · ButtonIconNormal · ButtonIconOutlined · ButtonIconSolid · ButtonOutlined · ButtonRoundButtonAlternative · ButtonRoundButtonAssistive · ButtonRoundButtonPrimary · ButtonRoundButtonSecondary · ButtonText · ButtonText2 · ButtonText3 · ButtonTextButtonAssistive · ButtonTextButtonPrimary · Camera · CardCard · CardListCard · CardResourceListLeadingContent · CardResourceListTrailingContent · CardResourceListTrailingContent2 · CardResourceNormalSave · CardResourceNormalTopContent · CategoryCategory · CategoryResourceChipAlternativeLarge · CategoryResourceChipAlternativeNormal · CategoryResourceChipAlternativeSmall · CategoryResourceChipAlternativeXSmall · CategoryResourceChipNormalLarge · CategoryResourceChipNormalNormal · CategoryResourceChipNormalSmall · CategoryResourceChipNormalXSmall · CellResourceTrailingContentBadge · CellResourceTrailingContentCheckbox · CellResourceTrailingContentIcon · CellResourceTrailingContentIcon2 · CellResourceTrailingContentSwitch · CellResourceTrailingContentText · CellResourceTrailingContentValue · CheckMarkResourceControl · CheckboxResourceControl · ChevronLeft · ChevronRight · ChipAction · ChipChip · ChipFilter · ChipMultiSelect · ChipResourceContentImage · CircularCircular · CircularCircular2 · CircularWanted · ColorOverlay · Content · ContentBadgeContentBadge · ControlCheck · ControlCheckMark · ControlCheckbox · ControlRadio · ControlSwitch · ControlSwitchKnob · ControlToggleIcon · ControlToggleIcon2 · CustomGradient · DatePickerIOSWheel · DecorateDimmer · DecorateInteraction · DecorateInteractionLight · DecorateInteractionLight2 · DecorateInteractionNormal · DecorateOpacity · Dimmer · Divider · DividerDivider · DocumentPerson · Dummy · EssentialEssential · FaceSmile · Filter · FilterButtonFilterButton · FooterFooter · FramedStyleFramedStyle · FramedStyleResourceFrame · FramedStyleResourceSelected · FramedStyleResourceSlot · GNBWanted · GradientBackgroundGradient · GradientCustomGradient · GradientMask · GradientMultiple · GradientResourceMaskBase · GradientResourceMaskSize · GradientSolid · GradientSolid2 · GradientStaticGradient · Heart · Home · HomeBarHomeBar · HomeBarResourceHomeIndicator · IconColorBlank · IconColorBookmarkNew · IconColorLogoApple · IconColorLogoFacebook · IconColorLogoGoogle · IconColorLogoGooglePlay · IconColorLogoInstagram · IconColorLogoKakao · IconColorLogoLinkedIn · IconColorLogoNaverBlog · IconColorLogoYouTube · IconIcons · IconIcons2 · IconIconsResponsive · IconNavigationCareer · IconNavigationMenu · IconNavigationMyPage · IconNavigationRecruit · IconNavigationSocial · IconNormalAward2 · IconNormalBlank · IconNormalBlank3 · IconNormalBlank5 · IconNormalBlank6 · IconNormalBookmark2 · IconNormalBulb2 · IconNormalCertificate2 · IconNormalCheck · IconNormalCheck3 · IconNormalChevronDown · IconNormalChevronDown3 · IconNormalChevronRight2 · IconNormalChevronRight3 · IconNormalChevronUp · IconNormalChevronUp3 · IconNormalCircleCheck2 · IconNormalCircleExclamation2 · IconNormalCircleInfo2 · IconNormalDot · IconNormalDot3 · IconNormalGlobe4 · IconNormalHandleDesktop2 · IconNormalLineHorizontal · IconNormalLineHorizontal3 · IconNormalListCategory · IconNormalMenu3 · IconNormalPerson · IconNormalPlay2 · IconNormalSearch3 · IconNormalSquareMore3 · IconNormalSun2 · IconNormalTrash3 · IconNormalTriangleExclamation2 · IconNormalTrophy2 · IconResourceRatio · IconsIcons · IconsIcons4 · IconsIcons5 · IconsIconsResponsive · Image · ImageLanguage · InspectMeasure · InteractionLight · InteractionLight2 · InteractionLight3 · InteractionNormal · InteractionNormal2 · InteractionStrong · Like · Link · ListCellListCell · ListCellResourceLeadingContent · ListCellResourceLeadingContent2 · ListCellResourceLeadingContent3 · ListCellResourceLeadingContent4 · ListCellResourceLeadingContent6 · Lock · LogoResourceAssetLogotypeAgent · LogoResourceAssetLogotypeGigs · LogoResourceAssetLogotypeLaaS · LogoResourceAssetLogotypeSpace · LogoResourceAssetLogotypeWanted · LogoResourceAssetLogotypeWanted6 · LogoResourceAssetSymbol · LogoResourceAssetSymbol2 · LogoResourceAssetSymbolAgent · LogoResourceAssetSymbolWanted · LogoResourceNormalHorizontal · LogoResourceNormalHorizontalWanted · LogoResourceNormalHorizontalWanted10 · LogoResourceNormalHorizontalWanted11 · LogoResourceNormalVerticalWanted · LogoResourceNormalVerticalWanted5 · LogoResourceSquareLogoWanted · LogoResourceSquareSymbolWanted · LogoWantedFavicon · LogoWantedLogoHorizontal · LogoWantedLogoHorizontal3 · LogoWantedLogoHorizontal4 · LogoWantedLogoVertical · LogoWantedPartnershipResourceCustom · LogoWantedPartnershipResourceDivider · LogoWantedResourceRatio · LogoWantedResourceRatio2 · LogoWantedResourceRatio3 · LogoWantedSubServicesResource · LogoWantedSymbol · MasterGrid · MenuMenu · MenuResourceActionArea · MenuResourceActionAreaLeading · MenuResourceActionAreaTrailing · MenuResourceItemCell · ModalResourceBottomOuterSafe · ModalResourceContentsCustom · ModalResourceHandle · ModalResourceModal · ModalResourceNavigation · ModalResourceNavigationResourceContents · ModalResourceNavigationResourceContents2 · ModalResourceNavigationResourceContents3 · ModalResourceNavigationResourceContents4 · ModalResourceNavigationResourceTool · ModalResourceNavigationResourceTool2 · ModalResourceStatusOuterSafe · Name · NavigationBarNavigationBar · NavigationBarResourceHomeIndicator · NavigationBarResourceIconBack · NavigationBarResourceIconHome · NavigationBarResourceIconRecent · NavigationNavigation · PageIndicatorResourceDotNormal · PageIndicatorResourceDotNormal2 · PaginationDots · PaginationNavigation · PaginationResourceDotSmallAdaptive · PaginationResourceDotSmallWhite · PaginationResourceNavigationButton · PaginationResourceNavigationContentLimit · PaginationResourceNavigationContentNavga · PaginationResourceNavigationPage · PointingDeviceCursor · PopoverPopover · PopoverResourceContents · PresentationAlertAlert · PresentationAlertResourceAction · PresentationAlertResourceBackground · PresentationPickerResourceGradient · PresentationPickerWheels · PresentationSheetResourceSpacing · ProjectAfter · ProjectAfterName · ProjectBefore · PushBadgePushBadge · PushBadgePushBadge3 · RadioResourceControl · Ratio · RatioHorizontal · RatioVertical · RatioVertical2 · RatioVertical3 · RatioVertical4 · SafariBarBar · SafariBarNavigationBar · SafariBarResourceButton · SafariBarResourceNav · SafariBarResourceNavBg · SafariBarResourceNavSymbol · SafeAreaBottom · SafeAreaStatus · ScrollBarScrollBar · SectionHeaderResourceLeadingContent · SectionHeaderResourceTrailingContent · SectionHeaderResourceTrailingContent3 · SectionHeaderSectionHeader · SegmentedControlResourceKnob · SegmentedControlSegmentedControl · SelectResourceBackground · SelectResourceChip · SelectResourceLeadingContent · SelectSelect · SelectionInputToggleResourceSwitch · SelectionInputToggleSwitch · SkeletonRectangle · SkeletonText · SnackbarSnackbar · SpacingBottomSafeArea · SpacingBottomSafeArea4 · SpacingBottomSafeArea5 · SpacingStatus · SpacingStatus5 · SpacingStatus6 · StatusBarResourceStatus · StatusBarResourceStatusNotch · StatusBarResourceStatusNotch2 · StatusBarResourceStatusPill · StatusBarResourceTime · StatusBarResourceTimeNotch · StatusBarResourceTimeNotch2 · StatusBarResourceTimePill · StatusBarStatusBar · StatusBarStatusBar2 · StatusBarStatusBarDeprecated · SwitchResourceSwitch · SwitchSwitch · TabResourceTab · TabTab · TextinputResourceBackground · TextinputResourceInteraction · TextinputResourceTextareaLeadingContent · TextinputResourceTextareaTrailingContent · TextinputResourceTextfieldButton · TextinputResourceTextfieldTrailingConten · TextinputTextarea · TextinputTextfield · ThemePrimaryButton · ThumbnailResourceOverlayCustom · ThumbnailResourceOverlayPlaytime · ThumbnailThumbnail · Time · ToastToast · TooltipResourceMediumArrow · TooltipResourceMediumArrowHorizontal · TooltipResourceMediumArrowVertical · TooltipResourceSmallArrow · TooltipResourceSmallArrowHorizontal · TooltipResourceSmallArrowVertical · TooltipTooltip · TopNavigationResourceActionFloat · TopNavigationResourceActionFloat2 · TopNavigationResourceActionNormal · TopNavigationResourceContents · TopNavigationResourceLeadingDefault · TopNavigationResourceLeadingFloat · TopNavigationResourceLeadingNormal · TopNavigationResourceLeadingNormal2 · TopNavigationResourceLeadingNormal3 · TopNavigationResourceToolSegmented · TopNavigationResourceToolTab · TopNavigationResourceTrailingNormal · TopNavigationTopNavigation

**`components/icon-set/`** — 187 glyph components, one per icon family in the file (see `components/icon-set/README.md`):

IconNormalAgent · IconNormalAgentSearch · IconNormalAiReview · IconNormalAlignCenter · IconNormalAlignJustify · IconNormalAlignLeft · IconNormalAlignRight · IconNormalAndroid · IconNormalApps · IconNormalArrowDown · IconNormalArrowLeft · IconNormalArrowRight · IconNormalArrowTurnDown · IconNormalArrowUp · IconNormalArrowUpRight · IconNormalAttachment · IconNormalBell · IconNormalBellPlus · IconNormalBold · IconNormalBook · IconNormalBookmark · IconNormalBubble · IconNormalBubblePlus · IconNormalBulb · IconNormalBusinessBag · IconNormalCalendar · IconNormalCalendarPerson · IconNormalCamera · IconNormalCaretDown · IconNormalCaretUp · IconNormalCertificate · IconNormalChange · IconNormalChat · IconNormalChevronDoubleLeft · IconNormalChevronDoubleRight · IconNormalChevronLeft · IconNormalChevronRight · IconNormalCircle · IconNormalCircleBlock · IconNormalCircleCheck · IconNormalCircleClose · IconNormalCircleDot · IconNormalCircleExclamation · IconNormalCircleInfo · IconNormalCirclePlus · IconNormalCirclePoint · IconNormalCircleQuestion · IconNormalCircleUpRight · IconNormalClock · IconNormalClose · IconNormalCode · IconNormalCoffee · IconNormalCoins · IconNormalColumn · IconNormalCompany · IconNormalCompanyCheck · IconNormalCompanyPlus · IconNormalCompass · IconNormalComponent · IconNormalCopy · IconNormalCrown · IconNormalDeepSearch · IconNormalDesktop · IconNormalDiamond · IconNormalDislike · IconNormalDocument · IconNormalDocumentPerson · IconNormalDocumentSearch · IconNormalDocumentText · IconNormalDownload · IconNormalExclamation · IconNormalExternalLink · IconNormalEye · IconNormalEyeSlash · IconNormalFaceSmile · IconNormalFilter · IconNormalFire · IconNormalFlag · IconNormalFlipBackward · IconNormalFolder · IconNormalFolderJob · IconNormalFolderStar · IconNormalFull · IconNormalGlobe · IconNormalGraduation · IconNormalHandle · IconNormalHandleDesktop · IconNormalHeart · IconNormalHeartInHeart · IconNormalHistory · IconNormalHome · IconNormalHourglass · IconNormalImage · IconNormalInbox · IconNormalInstance · IconNormalKeyboard · IconNormalLeftSide · IconNormalLike · IconNormalLink · IconNormalList · IconNormalListOrdered · IconNormalLocation · IconNormalLock · IconNormalLockOpen · IconNormalLogin · IconNormalLogoBrunch · IconNormalLogoMicrosoft · IconNormalLogoX · IconNormalLogout · IconNormalMagicWand · IconNormalMail · IconNormalMailOpen · IconNormalMedal · IconNormalMegaphone · IconNormalMenu · IconNormalMessage · IconNormalMicrophone · IconNormalMicrophoneSlash · IconNormalMinus · IconNormalMobile · IconNormalMoon · IconNormalMoreHorizontal · IconNormalMoreVertical · IconNormalMusicMicrophone · IconNormalPalette · IconNormalPassport · IconNormalPause · IconNormalPencil · IconNormalPersonPlus · IconNormalPersons · IconNormalPhone · IconNormalPin · IconNormalPlay · IconNormalPlus · IconNormalPresentation · IconNormalPrinter · IconNormalQuestion · IconNormalQuote · IconNormalRefresh · IconNormalRegex · IconNormalReplace · IconNormalReplaceAll · IconNormalReset · IconNormalSearch · IconNormalSend · IconNormalSetting · IconNormalShare · IconNormalShareIOS · IconNormalSparkle · IconNormalSquare · IconNormalSquareCaret · IconNormalSquareCheck · IconNormalSquareHan · IconNormalSquareHangul · IconNormalSquareKana · IconNormalSquareLatin · IconNormalSquareMore · IconNormalSquarePlay · IconNormalSquarePlus · IconNormalStar · IconNormalStorage · IconNormalStrikethrough · IconNormalSun · IconNormalTag · IconNormalTelescope · IconNormalTemplate · IconNormalTextFormat · IconNormalTextVariable · IconNormalThumbnail · IconNormalThunder · IconNormalTicket · IconNormalTrash · IconNormalTriangle · IconNormalTriangleExclamation · IconNormalTrophy · IconNormalTune · IconNormalUmbrella · IconNormalUnderline · IconNormalUpload · IconNormalUtility · IconNormalVerifiedCheck · IconNormalVerifiedStar · IconNormalVideo · IconNormalWebinar · IconNormalWholeWord · IconNormalWrite · IconNormalZepFast

**`components/logos/`** — 77 brand lockups across Wanted, Gigs, Space, Agent, OneID and LaaS (see `components/logos/README.md`):

LogoCircleWantedBlack · LogoCircleWantedDark · LogoCircleWantedGigsBlack · LogoCircleWantedGigsDark · LogoCircleWantedGigsLight · LogoCircleWantedGigsWhite · LogoCircleWantedLight · LogoCircleWantedSpaceBlack · LogoCircleWantedSpaceDark · LogoCircleWantedSpaceLight · LogoCircleWantedSpaceWhite · LogoCircleWantedSymbolBlack · LogoCircleWantedSymbolDark · LogoCircleWantedSymbolLight · LogoCircleWantedSymbolWhite · LogoCircleWantedWhite · LogoHorizontalLaaSBlack · LogoHorizontalLaaSDark · LogoHorizontalLaaSLight · LogoHorizontalLaaSWhite · LogoHorizontalWantedAgentBlack · LogoHorizontalWantedAgentDark · LogoHorizontalWantedAgentLight · LogoHorizontalWantedAgentShort · LogoHorizontalWantedAgentWhite · LogoHorizontalWantedBlack · LogoHorizontalWantedDark · LogoHorizontalWantedGigsBlack · LogoHorizontalWantedGigsDark · LogoHorizontalWantedGigsLight · LogoHorizontalWantedGigsWhite · LogoHorizontalWantedLight · LogoHorizontalWantedOneIDBlack · LogoHorizontalWantedOneIDDark · LogoHorizontalWantedOneIDLight · LogoHorizontalWantedOneIDWhite · LogoHorizontalWantedSpaceBlack · LogoHorizontalWantedSpaceDark · LogoHorizontalWantedSpaceLight · LogoHorizontalWantedSpaceShort · LogoHorizontalWantedSpaceWhite · LogoHorizontalWantedWhite · LogoResourceAssetLogotypeGigs2 · LogoResourceAssetLogotypeLaaS3 · LogoResourceAssetLogotypeSpace2 · LogoResourceAssetLogotypeWanted10 · LogoResourceAssetLogotypeWanted11 · LogoResourceAssetLogotypeWanted12 · LogoResourceAssetLogotypeWanted8 · LogoResourceAssetLogotypeWanted9 · LogoResourceAssetSymbol3 · LogoResourceNormalHorizontalWanted12 · LogoResourceNormalHorizontalWanted14 · LogoResourceNormalHorizontalWanted15 · LogoResourceNormalHorizontalWanted18 · LogoResourceNormalHorizontalWanted19 · LogoResourceNormalHorizontalWanted20 · LogoResourceNormalHorizontalWanted21 · LogoResourceNormalVerticalWanted6 · LogoResourceNormalVerticalWanted7 · LogoResourceNormalVerticalWanted8 · LogoResourceSquareLogoWanted5 · LogoResourceSquareLogoWanted6 · LogoResourceSquareLogoWanted7 · LogoResourceSquareSymbolWanted2 · LogoVerticalWantedBlack · LogoVerticalWantedDark · LogoVerticalWantedGigsBlack · LogoVerticalWantedGigsDark · LogoVerticalWantedGigsLight · LogoVerticalWantedGigsWhite · LogoVerticalWantedLight · LogoVerticalWantedSpaceBlack · LogoVerticalWantedSpaceDark · LogoVerticalWantedSpaceLight · LogoVerticalWantedSpaceWhite · LogoVerticalWantedWhite

Plus `Icon` in `components/icons/` (211 glyphs).

### Intentional additions

- **`Icon`** (`components/icons/Icon.jsx`) — a thin wrapper over the extracted glyph data. The source defines ~211 individual icon component sets rather than one parameterised component; a single wrapper is the only practical way to ship them.

### Coverage and intentional skips

The source file declares **959 component families** (770 component sets plus standalone symbols). This build implements **660** (396 in `components/core/`, 187 in `components/icon-set/`, 77 in `components/logos/`).

1. **Per-variant nodes counted as families (~370).** Figma reports each variant permutation of a large set as its own entry. `Control/Checkbox` alone has 48; `Button/Button` has 48; `Textinput/Textfield` has hundreds of `Status…Active…Focus…` permutations. These are compiled into the single parent component as a variant switch (`<ButtonButton variant="outlined" size="lg" disable />`), which is how the design system is meant to be consumed. Building them as separate components would be wrong, not more complete.
2. **The icon set — now built both ways.** Every icon family has a real component in `components/icon-set/` (187 of them, plus the 10 full-colour brand marks in `components/core/`). The same artwork is *also* available as flat data through `components/icons/Icon.jsx` (`<Icon name="…" size={24} />`) for pages that would rather not pull 200 components into a bundle. Pick whichever suits the consumer.
3. **Duplicated library copies (~60).** Several families appear two or three times because the file carries both a current and a legacy copy of the same component (two `Basic/Divider`, two `Badge/Push`, four `Decorate/Opacity`, eight `Button/Round Button/*`). Where the duplicates are byte-identical only one is built.
4. **Documentation and example scaffolding.** `_Dummy`, `Master Grid`, `Arrow with Texts`, `Arrow with Texts - Algorithm`, `Blank`, `Content` and the annotation shapes exist to lay out the Figma documentation boards. They are built where cheap but carry no product meaning.
5. **One deprecated set.** `Status Bar/_Status Bar (Deprecated)` is skipped on the file's own instruction.

Families the file does **not** define, despite being common elsewhere: Modal, Bottom Sheet, Date Picker (only `Date Picker/iOS/Wheel` exists), Time Picker, Slider, Stepper, Accordion, Table, Breadcrumb, Progress bar, Banner, Empty state. None were invented.

### Other known gaps

- The file defines **no Figma text styles or effect styles** (0 of each), so `tokens/fig-typography.css` is empty. The 19-style type scale in `tokens/typography.css` was transcribed from the Typography documentation page instead.
- **Fonts are not embedded in the .fig**, so no binary ships with this project. Pretendard JP and Wanted Sans Variable load from their official open-source CDN builds on `cdn.jsdelivr.net`. Both are confirmed rendering — Pretendard JP in the Display/Title/Body specimen cards, Wanted Sans Variable in the *Wanted Sans* card. No substitute family is used anywhere. For offline or self-hosted delivery, replace the two `@import` lines in `tokens/fonts.css` with local `@font-face` rules and keep the family names byte-identical.
- A 4.8 MB JPEG exceeded the extractor's per-image budget and was dropped; `AvatarResourceImagePerson3` falls back to its placeholder variant.
- `Ratio/*` and `Safe Area` spacers rely on vector geometry the extractor could not decode; they render as plain boxes.
