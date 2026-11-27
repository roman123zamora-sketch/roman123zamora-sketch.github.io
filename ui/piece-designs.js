// Original 80 × 80 profiles, in pawn, knight, bishop, rook, queen, king order.
// Each pair describes the outer contour and the principal material detail.
const ghosts = [
  ["M22 69Q30 60 33 48Q28 43 29 38Q30 28 40 28Q50 28 51 38Q52 44 47 48Q50 61 58 69Q56 73 48 71Q40 75 32 71Q25 75 22 69Z", "M43 46Q46 47 47 49Q47 61 54 70L48 71Q40 63 43 46Z"],
  ["M17 41Q17 38 23 33L29 25Q31 19 37 16L40 8Q45 8 47 15Q57 20 59 31Q62 44 53 56L56 64Q61 66 61 70Q55 74 48 71Q37 75 29 71Q23 74 20 70Q23 63 30 60Q38 49 41 35L32 39Q27 48 21 46Z", "M44 17Q57 24 55 38Q54 51 45 57L48 65Q56 66 56 71L49 71Q42 64 40 58Q50 41 44 17Z"],
  ["M21 69Q29 62 33 49L33 44Q26 40 28 34Q31 22 39 10Q43 12 47 21L40 29Q45 28 50 25Q55 34 52 39Q50 42 47 44L47 50Q49 61 59 69Q54 74 47 71Q39 75 31 71Q25 73 21 69Z", "M33 43Q40 47 47 42L47 46Q40 49 33 46Z M45 47Q45 63 53 70L47 71Q39 65 45 47Z"],
  ["M19 69Q22 64 27 62L28 42Q23 40 22 35V22Q23 18 29 18L33 19V25Q36 27 38 24V19Q40 16 45 19V24Q48 27 51 25V19Q58 17 58 23V35Q57 39 52 43L54 62Q59 64 61 69Q58 74 49 71Q39 75 30 71Q24 74 19 69Z", "M28 39Q40 44 52 39L52 44Q40 47 28 43Z M49 44Q51 49 53 63L58 69L51 71Q46 62 49 44Z"],
  ["M19 69Q26 62 32 50L33 44Q27 42 25 35L20 24Q20 20 24 21L33 29L37 18Q39 12 42 13L48 29L56 21Q61 20 60 25L54 37Q52 42 47 44L48 51Q52 62 61 69Q55 74 48 71Q39 75 31 71Q24 74 19 69Z", "M28 36Q40 40 52 35Q51 43 46 44Q39 48 33 44Z M44 48Q45 64 55 70L48 71Q39 64 44 48Z"],
  ["M19 69Q28 63 32 51L33 45Q26 41 27 33L28 25L23 23Q21 18 27 16L35 16L36 8Q39 2 44 7L46 16L54 16Q59 17 58 22L52 25L54 33Q56 42 47 45L48 52Q53 63 61 69Q56 74 48 71Q39 75 30 71Q24 74 19 69Z", "M44 19Q49 23 49 30Q52 41 44 46Q43 61 53 70L47 71Q39 64 40 55Q39 48 43 42Q48 33 44 19Z"]
];

const ghostEyes = [
  [40, 41, 3.6, 1.55, 2.4], [34, 28, 3.6, 1.45, 2.35], [40, 36, 4.2, 1.55, 2.45],
  [40, 33, 4.7, 1.65, 2.2], [40, 34, 4.5, 1.55, 2.45], [40, 32, 4.0, 1.55, 2.45]
];

function eyes([x, y, spread, rx, ry]) {
  return `<g class="ghost-eyes" fill="#342639" stroke="#faf1f4" stroke-opacity=".65" stroke-width=".65">
    <ellipse cx="${x - spread}" cy="${y}" rx="${rx}" ry="${ry}"/>
    <ellipse cx="${x + spread}" cy="${y}" rx="${rx}" ry="${ry}"/>
  </g>`;
}

const reef = [
  ["M23 64Q33 58 34 44C25 41 27 26 38 25Q50 23 52 34Q53 42 46 45Q47 56 57 64Z","M40 32Q36 25 32 32Q34 36 40 36Q47 35 47 29Q43 28 40 32Z"],
  ["M23 64Q35 53 39 38L30 45Q22 48 17 41Q16 39 21 34L28 27Q30 18 38 16L41 9L47 15Q55 20 57 30Q61 47 55 64Z","M52 51Q56 39 54 30L49 23Q47 20 50 19L54 23Q55 17 51 13Q50 10 53 11Q59 16 58 25L61 21L62 16Q64 13 66 16L65 23L60 31L61 36L65 31Q69 30 68 34L62 43L59 52Z"],
  ["M24 64Q33 56 33 44Q26 40 30 31Q32 22 40 12Q47 19 49 25L42 32L51 28Q57 42 47 46Q46 56 56 64Z","M45 35Q42 35 41 30Q37 28 38 34Q39 40 46 41Q53 39 54 34Q53 30 49 36Q49 32 47 32Z"],
  ["M23 64L27 51L29 38L24 34L23 20Q24 17 30 19L32 26L36 26L37 18Q40 16 44 18L44 25L49 25L51 18Q57 17 57 22L56 35L51 39L53 54L57 64Z","M46 41Q47 35 53 33Q55 32 55 36L53 39L59 36Q63 36 61 40L55 44Q52 48 46 47Z"],
  ["M22 64Q32 56 32 46Q26 41 26 35L20 25Q18 19 23 19Q28 19 30 27L33 31L35 19Q36 13 40 13Q43 14 44 20L46 31L51 25Q53 17 58 20Q63 22 58 29L54 38Q53 44 48 47Q47 56 58 64Z","M27 32Q34 38 39 34L39 19Q40 17 41 20L44 34Q49 37 54 30L51 41Q40 47 29 40Z"],
  ["M23 64Q34 55 34 45Q27 40 28 31Q30 24 37 24L37 18L30 17Q27 15 30 12L37 12L38 6Q40 3 44 7L44 12L51 11Q54 13 52 17L44 18L44 24Q53 24 54 33Q55 40 47 45Q47 55 57 64Z","M34 35Q39 32 40 25L40 15L32 15L40 14L41 8L42 14L50 14L43 15L43 27Q43 33 49 36Q41 43 34 35Z"]
];

const fossil = [
  ["M24 64Q33 56 33 46Q33 43 29 40Q24 32 31 26Q36 22 40 26Q46 22 51 28Q56 34 50 42L46 46Q46 57 56 64Z","M32 38Q41 44 49 36Q48 43 44 46L36 46Z"],
  ["M23 64L28 55L34 53L32 49Q34 45 42 43L45 36L39 39L36 43L28 46Q21 48 17 43Q15 41 18 37L29 26L32 19L39 16L43 9L46 16Q55 18 59 25Q61 34 55 39L57 43L54 48L58 52L54 57L56 64Z","M37 25Q41 20 46 23Q49 27 44 31L40 32Q36 31 37 25Z M24 36L29 32L37 33L30 37Z M34 51Q45 48 53 50L51 53L33 55Z M32 58Q41 55 54 56L52 59L30 61Z"],
  ["M24 64Q33 57 33 48L33 43Q27 42 28 35Q28 28 34 23L39 12Q41 10 43 14L49 23L40 32L51 28Q57 40 48 44L47 50Q47 57 56 64Z","M33 40Q40 45 48 39L47 46Q40 49 33 46Z"],
  ["M23 64L28 53L29 39L24 35L23 22Q24 17 29 19L32 25L35 25L36 19Q38 15 43 18L45 25L48 25L50 19Q55 17 57 21L56 35L51 39L52 54L57 64Z","M28 35Q40 40 52 34L50 39Q40 43 30 39Z"],
  ["M23 64Q32 56 33 47L27 39L21 23Q22 18 26 20L34 31L38 16Q40 12 43 15L47 31L55 20Q60 18 60 23L54 39L48 47Q48 56 57 64Z","M27 36Q40 44 54 35L51 42Q40 48 29 42Z"],
  ["M23 64Q33 55 33 47L31 40Q25 32 30 28L37 26L36 19L30 19Q26 16 29 12L36 12L36 7Q40 2 44 7L44 12L50 11Q54 15 51 19L44 19L43 26L50 27Q56 31 50 40L47 47Q47 55 57 64Z","M32 34Q40 39 49 34L47 41Q40 45 33 40Z"]
];

const ruins = [
  ["M23 64L31 57L33 45L29 40L29 33L35 27L44 26L51 32L52 39L47 45L49 57L57 64Z","M31 34L36 28L44 27L48 31L39 31L34 36Z M47 45L49 57L57 64H44L42 47Z"],
  ["M22 64L28 53L39 44L43 34L35 36L28 44L19 43L16 39L27 26L32 19L38 16L40 9L47 14L57 20L62 35L58 51L54 64Z","M46 17L55 22L60 36L56 50L53 62H43L51 46L53 33Z M31 26L38 22L39 26L34 29Z"],
  ["M23 64L30 57L32 42L29 38L31 30L39 10L47 22L39 31L49 26L53 36L50 41L48 56L57 64Z","M39 13L44 22L37 32L42 51L42 64H49L46 55L49 40L51 36L49 28L37 35L35 31Z"],
  ["M22 64V59L26 56L28 39L22 35V19L31 18V25H36V18H44V25H49V18L58 19V35L52 39L54 56L58 59V64Z","M27 33H53L49 37H31Z M36 61V51L40 47L44 51V61Z"],
  ["M22 64L30 55L33 47L27 41L21 22L26 21L34 32L37 16L41 13L45 17L47 32L55 21L60 22L54 41L48 47L50 55L58 64Z","M29 38L40 43L52 38L49 44L40 48L32 44Z M43 49L47 49L50 57L55 63H45Z"],
  ["M22 64L30 56L32 43L28 38L28 28L36 23V17H29V11H36V5H44V11H51V17H44V23L52 28V38L48 43L50 56L58 64Z","M42 6V13H49V16H42V25L50 30V37L46 42L48 57L55 63H43L42 42L44 36L42 29Z"]
];

const steam = [
  ["M23 64L25 57H31L34 47V43L29 40V31Q30 25 40 25Q50 25 51 31V40L46 43V47L49 57H55L57 64Z","M29 37H51V40L46 43H34L29 40Z M36 45H42V57H34Z"],
  ["M22 64L28 54L38 47L43 35L36 37L27 45L19 44L17 39L27 27L31 19L39 16L41 8L47 13L56 18L62 29L61 42L55 55L55 64Z","M46 17L55 20L60 30L59 41L53 54L48 58L40 56L37 50L43 38L51 33Z M32 26L38 23L40 25L35 29Z"],
  ["M23 64L28 56H32V44L28 40L31 31L36 27L37 19L40 12L44 19L45 27L50 31L52 40L47 44V56H52L57 64Z","M34 34L49 22L52 25L38 39L34 39Z M32 43H48V47H32Z"],
  ["M22 64L25 57H29V39L24 35V21H31V26H36V18H44V26H49V21H56V35L51 39V57H55L58 64Z","M25 33H55V37L51 40H29L25 37Z M33 44H38V56H33Z M44 44H47V56H44Z"],
  ["M22 64L30 56L33 45L28 42L21 24L26 21L34 33L37 22L36 17L40 13L44 17L43 22L46 33L54 21L59 24L52 42L47 45L50 56L58 64Z","M28 37L36 33H44L52 37L50 42H30Z M36 46H44V58H36Z"],
  ["M22 64L27 56H33V45L29 40V29L36 25V17H29V11H36V5H44V11H51V17H44V25L51 29V40L47 45V56H53L58 64Z","M33 34H47V39H33Z M38 44H43V56H38Z M30 13H50V15H30Z"]
];

const circuit = [
  ["M23 64L30 55L33 44L28 39V33L34 25H46L52 33V39L47 44L50 55L57 64Z","M35 35H45"],
  ["M22 64L27 54L37 47L42 36L35 37L28 44H20L16 40L26 28L31 19L38 16L41 8L47 14L56 17L62 28V40L55 54V64Z","M25 39L31 34H39L49 25V20"],
  ["M23 64L29 55L32 44L28 39V32L38 12H42L49 25L39 33L51 29L53 36L50 43L49 55L57 64Z","M34 37L45 27"],
  ["M22 64L27 55V40L23 36V20H30V25H35V18H45V25H50V20H57V36L53 40V55L58 64Z","M29 31H37L40 35H50"],
  ["M22 64L29 55L32 47L27 42L21 23H27L34 31L37 16H43L47 31L53 23H59L53 42L48 47L51 55L58 64Z","M28 34L33 39H47L52 34"],
  ["M22 64L29 55L32 44L27 39V30L34 24H37V18H29V12H37V5H43V12H51V18H43V24H46L53 30V39L48 44L51 55L58 64Z","M33 34H47 M40 28V40"]
];

const origami = [
  ["M22 64L33 54L35 45L28 37L30 30L40 24L49 30L52 37L45 45L47 54L58 64Z","M40 24L39 39L28 37L35 45L33 54L22 64H40L39 51L45 45L52 37L39 39Z"],
  ["M22 64L34 48L44 31L32 38L27 45L16 40L27 27L34 19L40 17L42 8L50 17L59 24L62 35L55 64Z","M42 8L46 23L34 20Z M16 40L32 32L38 25L44 31L32 38L27 45Z M49 21L56 34L42 47L34 48L22 64H46L55 64L62 35L59 24Z"],
  ["M22 64L32 52L33 44L27 38L40 11L52 34L47 44L48 53L58 64Z","M40 11L40 30L27 38L46 31L52 34L47 44L34 45L40 51L22 64H48L43 53L44 43L33 40L40 37Z"],
  ["M22 64L27 55L28 41L23 35V20L31 23L34 28L37 19H43L46 28L50 23L57 20V35L52 41L53 55L58 64Z","M23 20L29 30L40 34L51 30L57 20V35L51 40L40 37L28 41L23 35Z M40 37L52 41L53 55L58 64H40Z"],
  ["M22 64L31 55L34 46L27 41L20 22L33 31L40 14L47 31L60 22L53 41L46 46L49 55L58 64Z","M20 22L31 37L40 42L50 37L60 22L53 41L46 46L40 43L34 46L27 41Z M40 14L47 31L40 42Z M40 46L49 55L58 64H39Z"],
  ["M22 64L31 54L33 44L27 38L30 29L36 24V18H28V12L37 13L38 5L43 7V13L52 12V18H43V24L50 29L53 38L47 44L49 54L58 64Z","M28 12L40 15L52 12V18L40 17L28 18Z M38 5L43 7V24L50 29L53 38L47 44L49 54L58 64H42L39 50L41 42L33 39L40 34Z"]
];

const candy = [
  ["M23 64Q33 57 34 45C23 39 29 24 40 24S57 39 46 45Q47 57 57 64Z","M33 34Q35 27 41 28"],
  ["M22 64Q28 54 36 48Q42 42 43 33L35 37L29 44Q24 48 18 42Q15 39 20 34L29 25Q31 18 38 16L42 8Q47 9 48 16Q60 20 62 33Q64 47 55 64Z","M24 37L33 27Q35 22 40 21"],
  ["M23 64Q33 56 33 45Q26 43 28 34Q31 22 39 12Q41 10 43 14L48 23L40 32L50 27Q57 42 47 45Q47 56 57 64Z","M32 35Q34 25 39 19"],
  ["M22 64Q25 58 28 54L29 39Q24 36 24 31V22Q24 18 29 18Q33 18 33 22V25H36V21Q36 16 40 16Q44 16 44 21V25H47V22Q47 18 51 18Q56 18 56 22V31Q56 36 51 39L52 54Q55 58 58 64Z","M28 24V31Q28 34 32 35"],
  ["M22 64Q32 56 33 46Q27 43 26 35L20 25Q18 20 22 18Q27 16 30 22L34 31L36 18Q37 12 41 12Q45 13 45 18L47 31L51 22Q54 16 58 18Q63 20 60 25L54 35Q53 43 47 46Q48 56 58 64Z","M28 33Q33 38 40 38"],
  ["M22 64Q32 56 33 46Q27 43 27 34Q27 27 36 26V18H31Q27 18 27 14Q27 10 31 10H36V7Q36 3 40 3Q44 3 44 7V10H49Q53 10 53 14Q53 18 49 18H44V26Q53 27 53 34Q53 43 47 46Q48 56 58 64Z","M31 34Q31 29 37 29"]
];

const toy = [
  ["M23 64Q28 59 32 54L33 44C23 37 29 24 40 24S57 37 47 44L48 54Q52 59 57 64Z","M29 37Q40 42 51 37Q50 44 46 45H34Q30 43 29 37Z"],
  ["M22 64Q27 55 36 48L42 35L35 38L29 45Q24 49 18 46Q14 45 16 40L24 29Q29 20 38 16L41 10Q46 9 49 16Q59 19 62 30Q64 45 55 64Z","M46 17Q58 20 59 32Q62 45 54 58L47 58Q56 39 52 28Q50 22 46 17Z"],
  ["M23 64Q31 57 32 48L33 43Q27 39 29 32Q32 22 39 12Q41 10 43 13L49 23L41 32L51 28Q56 40 47 44L48 53Q51 59 57 64Z","M32 44Q39 48 48 44L48 49Q40 53 32 49Z"],
  ["M22 64L26 55L28 39Q24 38 24 34V22Q24 18 28 18H32V25H36V18H44V25H48V18H52Q56 18 56 22V34Q56 38 52 39L54 55L58 64Z","M24 32H56V35Q56 39 51 39H29Q24 39 24 35Z"],
  ["M22 64Q32 56 33 47L29 43L21 25Q20 20 24 20Q28 20 30 24L34 31L36 18Q37 13 41 13Q45 13 46 18L47 31L52 24Q55 19 58 20Q62 21 59 27L52 43L47 47Q48 56 58 64Z","M27 35Q40 41 53 35L50 42Q40 47 30 42Z"],
  ["M22 64Q32 56 33 46Q27 41 28 33Q29 27 36 26V18H31Q28 18 28 14Q28 11 31 11H36V7Q36 4 40 4Q44 4 44 7V11H49Q52 11 52 14Q52 18 49 18H44V26Q51 27 52 33Q53 41 47 46Q48 56 58 64Z","M29 36Q40 41 51 36L49 43Q40 48 31 43Z M30 13H50V16H30Z"]
];

const designs = {
  haunted: { profiles: ghosts, pale: ["#fffefa","#e9e7e6","#9d9aae","#51485f","#575268","#fffdf6"], dark: ["#a483bc","#533462","#281b3b","#1d142a","#ddbb86","#d0a8e4"] },
  "ocean-reef": { profiles: reef, pale: ["#fff2d4","#decba7","#9d856d","#655041","#c6ac89","#fff5dd"], dark: ["#61778b","#354755","#18252f","#101a25","#f18a78","#9eb8bf"] },
  fossil: { profiles: fossil, pale: ["#fff1d1","#d9be91","#9f7a50","#6c5039","#795939","#fff1cb"], dark: ["#997454","#574338","#302725","#211a1a","#b38c69","#c4a184"] },
  "ancient-ruins": { profiles: ruins, pale: ["#ffedd1","#d8b585","#9b754f","#725237","#a27854","#fff0cc"], dark: ["#7d8b9b","#465461","#242e39","#17222c","#29343e","#a9b4b8"] },
  steampunk: { profiles: steam, pale: ["#fff0b8","#d6a859","#936327","#5d4025","#6a492c","#fff0bd"], dark: ["#7d7c7b","#42464c","#24282c","#16191e","#cb895f","#d9a083"] },
  "neon-circuit": { profiles: circuit, pale: ["#f3ffff","#cbdee4","#849bac","#4a6274","#006f95","#fcffff"], dark: ["#647080","#323944","#1a2029","#121924","#f694d4","#9faec5"] },
  origami: { profiles: origami, pale: ["#fff9e4","#eee0bd","#cbb58f","#806c59","#bda884","#fffdf0"], dark: ["#8385b8","#494e80","#2d3256","#1d233b","#30355f","#a7a9d7"] },
  candy: { profiles: candy, pale: ["#fffef3","#fff0d9","#d8ab9d","#853140","#c62e49","#fffdf5"], dark: ["#a5716d","#634044","#381f2a","#2a1723","#b76c87","#f1b5a2"] },
  toy: { profiles: toy, pale: ["#fff6d4","#ebca8a","#b38046","#745334","#c25949","#fff0c4"], dark: ["#6f9dba","#386583","#233c52","#182c3e","#c78b55","#c2d9db"] }
};

const pieceIndex = { p: 0, n: 1, b: 2, r: 3, q: 4, k: 5 };
// Team hue covers the body, rim and base. Material-specific highlights still shape the piece.
const teamColors = {
  red: ["#ffbfad", "#df574d", "#832b38", "#541a28", "#ff9d85", "#fff0db"],
  blue: ["#c3edff", "#478fd9", "#254b97", "#172d5b", "#7bd9ff", "#e3faff"],
  yellow: ["#ffedac", "#e6b343", "#93631a", "#533712", "#ffe082", "#fff6d0"],
  green: ["#c8f9a9", "#59b85b", "#287044", "#19452d", "#a0f27a", "#e9ffdb"]
};
const toyPaint = ["#c65042", "#326b8d", "#b55944", "#376c78", "#b84847", "#386684"];
const reefColors = ["#f2906b", "#f3a3bd", "#ac9bea", "#f7ac73", "#ed7a78", "#72d2bd"];
const base = "M26 63H54Q58 64 58 68L61 70V73Q60 75 57 75H23Q20 75 19 73V70L22 68Q22 64 26 63Z";
const witchHats = [
  "M28 28Q33 24 35 19Q38 13 44 15L47 19Q42 17 42 21L47 26Q56 28 50 31Q38 33 28 31Q25 30 28 28Z",
  "M39 16L42 10Q45 3 51 6L54 10Q49 8 49 12L52 17Q58 20 54 22Q45 22 39 18Z",
  "M27 37Q35 34 36 24L38 14Q40 8 46 11L49 14Q43 13 44 17L47 22L41 30L49 26L53 35Q58 40 49 41Q36 42 28 40Z",
  "",
  "M24 29Q34 31 36 22L41 14Q44 10 50 13L53 17Q49 15 47 17L47 23Q50 30 57 29L55 36Q40 41 26 36Z",
  "M27 30Q34 27 35 21L39 8Q42 4 47 8L51 11L46 10L47 20Q48 27 54 30L56 36Q42 41 27 36Z"
];
const hatBands = ["M31 27Q39 29 48 27","M41 15L51 18","M32 36Q41 39 51 36","","M28 33Q41 37 54 32","M32 31Q40 35 51 31"];

// Broad lit faces follow the construction of each piece. Pawn through king.
const litFaces = {
  haunted: [
    "M24 68Q34 55 34 43Q32 34 40 31Q29 29 30 44Q29 59 21 68Q23 71 27 71Z",
    "M19 41Q31 35 36 23Q38 17 42 16L42 11Q38 18 34 19Q29 23 27 29Z M23 69Q33 57 38 45Q34 61 34 71Q28 69 23 71Z",
    "M23 68Q36 51 34 37Q33 31 39 14Q30 26 30 39Q30 51 21 68Z",
    "M22 69L26 44V25Q28 20 31 22L33 27Q29 24 29 30L30 44Q33 57 27 72Z",
    "M23 69Q34 53 31 41L25 24Q32 30 36 24Q33 33 36 42Q38 53 29 71Z",
    "M22 69Q33 51 33 37L31 24Q29 18 36 18L40 9L41 15L37 22Q33 27 38 38Q40 51 30 71Z"
  ],
  "ocean-reef": [
    "M30 37Q30 26 43 27Q45 31 40 32Q35 32 34 39Z",
    "M19 39L29 26Q32 19 42 18Q46 20 43 25Q35 24 30 35L23 41Z",
    "M31 36Q31 27 40 15L45 22Q37 24 36 34Z",
    "M25 22Q27 19 29 22L32 29L39 28L36 34L29 36L25 32Z",
    "M22 22Q26 20 28 27L34 36Q30 39 28 34Z M36 29L38 17L41 16L41 29Z",
    "M30 33Q31 28 39 27L40 17L42 20V29L36 35Q33 38 30 33Z"
  ],
  fossil: [
    "M29 35Q29 27 35 27Q39 27 41 30Q44 25 49 29Q43 31 42 38Q35 41 29 35Z",
    "M20 39L31 26L36 20Q42 16 48 19L53 23Q44 20 38 24L33 31L26 37Z",
    "M30 35Q31 28 36 23L40 15L44 21Q36 29 35 37Z",
    "M25 22Q28 19 30 25L32 29H37L40 21L43 24L44 30L34 33L28 31Z",
    "M23 23L33 34L39 18L42 17L40 32L44 39Q34 42 29 36Z",
    "M31 30Q35 28 39 28V17L31 16V14L39 14V7L42 7V26Q44 34 35 36Z"
  ],
  "ancient-ruins": [
    "M30 34L37 28L44 28L48 31L37 32L34 37Z M33 48L38 45L36 57L29 61Z",
    "M18 39L28 28L33 21L40 17L42 12L46 15L40 23L32 27L26 38Z",
    "M31 36L33 29L39 13L41 18L36 32L36 40Z",
    "M24 20L31 19V27L36 27L37 20L43 20V23H39V31H28L27 34L24 32Z",
    "M22 23L26 22L34 35L39 17L41 15L42 19L39 37L34 41L28 36Z",
    "M30 29L38 25V16H31V13H38V7H42V10L40 12V28L35 33L35 40L30 37Z"
  ],
  steampunk: [
    "M30 31Q36 26 44 28L46 30Q37 30 33 34V37H30Z",
    "M19 39L29 28L34 21L41 18L43 12L47 16L42 22L35 24L26 38Z",
    "M30 39L33 32L38 28L39 18L41 15V31L35 36L34 41Z",
    "M26 23H30V30H36V21H40V30H53V33H27Z",
    "M24 24L27 24L35 35L40 23L41 19L43 22L40 36L36 40L30 38Z",
    "M31 14H39V7H42V25L36 31V35H31V29L38 25V16H31Z"
  ],
  "neon-circuit": [
    "M30 34L35 27H45L48 30H37L33 35V39H30Z",
    "M19 40L28 28L33 21L40 18L42 11L46 15L42 21L36 24L31 30L24 40Z",
    "M30 33L39 15H41L42 19L35 33L35 39H31Z",
    "M25 22H29V27H36V20H43V23H39V30H28V34L25 32Z",
    "M23 25H26L34 34L38 18H41L39 33L35 38L29 34Z",
    "M31 14H39V7H41V25L34 31V38H30V31L37 25V16H31Z"
  ],
  origami: [
    "M30 36L40 25L39 39Z M35 46L39 51L33 62H25Z",
    "M17 40L33 23L42 20L37 27L30 33Z M43 10L49 17L46 22Z",
    "M28 37L39 14V30Z M33 50L40 52L32 63H25Z",
    "M25 23L31 25L34 31L28 32Z M36 28L40 21L44 28L40 33Z M30 42L39 39V63H25L29 54Z",
    "M22 24L32 34L34 39L27 36Z M34 32L39 18V39Z M33 50L39 46V63H25Z",
    "M30 13L39 15L38 17H30Z M39 19L41 25L33 31L30 37L29 35L31 30Z"
  ],
  candy: [
    "M31 35Q32 27 41 26Q45 26 47 29Q38 28 35 36Q33 39 31 35Z",
    "M20 40L30 26Q32 20 40 18Q46 17 49 20Q39 20 35 27L26 40Q22 44 20 40Z",
    "M31 37Q31 29 39 17Q43 15 43 19Q37 26 35 36Q34 40 31 37Z",
    "M27 22Q29 19 31 22V29Q35 32 43 30Q43 34 38 35Q27 35 27 30Z",
    "M23 22Q26 20 28 24L33 34Q32 37 29 35Z M37 22Q38 14 41 15L41 24Q39 28 37 26Z",
    "M30 34Q30 28 38 28Q43 28 43 31Q36 30 34 35Q31 38 30 34Z"
  ],
  toy: [
    "M30 34Q33 25 42 26Q45 26 47 29Q38 28 35 35Q32 38 30 34Z",
    "M20 39L29 29Q32 22 41 19Q45 18 48 20Q38 22 32 30L25 40Q22 42 20 39Z",
    "M31 37Q29 32 39 15Q41 14 42 17Q35 27 35 36Q33 39 31 37Z",
    "M26 22Q26 20 30 20V28H37V22Q38 20 41 20V29H28V34H26Z",
    "M23 24Q23 21 26 22L34 34L39 18Q40 16 42 17L38 35Q35 39 31 35Z",
    "M30 34Q30 29 37 27L40 28Q38 32 34 36Q31 37 30 34Z"
  ]
};

const feet = {
  "ocean-reef": "M26 62Q31 64 37 63L52 62Q58 63 58 68Q62 69 61 73Q59 76 50 75L25 75Q18 74 19 71Q20 68 23 67Z",
  fossil: "M27 63Q33 61 41 64Q51 61 55 64L58 68Q63 68 62 73Q61 76 55 75L26 75Q20 76 18 72Q18 68 23 68Z",
  "ancient-ruins": "M24 63H55L58 66V69L62 70V75H18V70L22 68V65Z",
  steampunk: "M24 63H56V67L61 69V74H19V69L24 67Z",
  "neon-circuit": "M23 63H57L59 66V68L61 70V73L59 75H21L19 73V70L21 68V65Z",
  origami: "M25 62L40 65L55 62L61 70L58 74L40 75L22 74L19 70Z",
  toy: "M26 62H54Q57 62 58 67Q62 68 62 72Q62 75 58 75H22Q18 75 18 72Q18 68 22 67Q23 62 26 62Z"
};

const ribbonPaths = [
  "M24 27Q35 29 51 23 M26 39Q37 42 53 31 M27 53Q38 56 56 43 M24 66Q38 66 55 55",
  "M22 25Q44 28 54 15 M12 43Q24 45 38 29Q50 32 65 24 M34 49Q46 53 64 40 M26 63Q40 67 59 55",
  "M30 27Q42 26 49 16 M25 40Q35 44 53 32 M30 52Q43 52 54 42 M24 65Q37 64 53 55",
  "M22 23Q43 30 59 20 M22 37Q43 43 58 32 M25 51Q41 55 55 45 M22 64Q41 67 56 57",
  "M17 22Q25 26 32 21 M32 22Q40 28 50 19 M48 27Q57 28 64 20 M23 40Q43 42 57 30 M25 54Q41 56 56 44 M27 66Q42 65 57 54",
  "M36 7L45 9 M35 20L45 22 M31 10L30 18 M48 10L46 18 M25 35Q39 39 53 29 M29 51Q39 53 55 42 M25 64Q40 66 56 54"
];

function path(d, fill, stroke = "none", width = 1) {
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
}

// Shapes of the cut, folded or molded surfaces, including their joints.
const reliefEdges = {
  "ocean-reef": [
    "M31 42q9 5 18-1 M34 56q5 3 10 1",
    "M21 39q7-2 12-9 M44 35q-1 16-13 24",
    "M31 36q7 8 17 4 M34 56q6 3 11 0",
    "M27 31q12 5 26 0 M34 40l-2 16",
    "M28 36q12 7 24-1 M34 50q6 4 12 0",
    "M29 35q11 9 24-1 M34 48q6 4 13 0"
  ],
  fossil: [
    "M31 34q4-8 10-5 M34 46q5 4 11 0",
    "M21 39l9 1 9-7 M35 46l13-4m-14 13 17-4",
    "M38 19q-4 9-5 14 M33 44q7 3 14 0",
    "M29 27v6m8-6v7m9-7v6 M30 40q11 4 21-1",
    "M26 27l7 11m7-16 1 15m13-10-6 10 M34 47q6 3 11 0",
    "M39 9v16 M32 39q7 5 15 1"
  ],
  "ancient-ruins": [
    "M32 40l6 3 10-2 M31 57h18",
    "M26 32l8-9 6-3 M27 57h14l8-12",
    "M39 16l-5 13 M31 38l5 3h10",
    "M24 35h31 M28 48h5m14 0h5 M26 57h8m12 0h8",
    "M28 37l6 7h12l7-7 M33 51h14",
    "M31 27l9 4 9-4 M32 45l8 3 8-3"
  ],
  steampunk: [
    "M31 35h17 M36 49h8 M35 54h10",
    "M22 40l10-12 7-4 M42 43l6-8 9-3",
    "M32 39h16 M34 50h12",
    "M26 36h28 M32 43h16 M35 49h2m7 0h2",
    "M29 39q11 6 22 0 M34 50h12",
    "M34 35h13 M36 46h8 M32 55h16"
  ],
  "neon-circuit": [
    "M30 39h20 M35 48h10",
    "M23 42h6l12-8 M46 45l6-8v-8",
    "M30 38h7l12-11 M33 47h14",
    "M25 35h30 M31 39v15h18",
    "M28 38l5 6h14l5-6 M35 50h10",
    "M29 36l5 6h12l5-6 M35 47h10"
  ],
  origami: [
    "M29 37l10 2 11-2 M35 46l4 5",
    "M18 40l12-7 8-8 M35 48l17-9 5-6 M43 11l4 10",
    "M29 38l17-7 M33 44l10 1 M37 51l-8 10",
    "M25 32l15 5 15-3 M40 39v22",
    "M24 28l10 12 6 2 14-8 M39 44v18",
    "M30 16l10 1 10-2 M34 39l7 3 8-4"
  ],
  toy: [
    "M29 40q10 6 21 0 M32 56q8 2 16 0",
    "M22 42l7-3m18-18q10 7 10 17m-18 5q-3 8-10 13",
    "M31 45q10 4 18 0 M34 55q5 2 11 0",
    "M24 32q16 4 32 0 M29 43q11 2 22 0",
    "M29 37q10 6 22 0 M34 49q5 2 12 0",
    "M30 14h6 M43 14h7 M31 38q9 5 18 0"
  ]
};

function relief(theme, index, id) {
  const contour = reliefEdges[theme]?.[index];
  if (!contour) return "";
  return `<g clip-path="url(#${id}-shape)">
    <g transform="translate(.3 .7)" opacity=".48">${path(contour, "none", `url(#${id}-inset)`, 1.7)}</g>
    <g opacity=".85">${path(contour, "none", `url(#${id}-edge-light)`, 1.15)}</g>
  </g>`;
}

export function redesignedArtwork(theme, piece, side, id, classicProfile) {
  const design = designs[theme];
  if (!design) return undefined;
  const index = pieceIndex[piece];
  const white = side === "white";
  const team = teamColors[side];
  const [light, mid, dark, edge, accent, glint] = team ?? (white ? design.pale : design.dark);
  const draped = theme === "haunted" && (white || Boolean(team));
  const [outline, detail] = design.profiles[index];
  const face = `url(#${id}-face)`;
  const bevel = `url(#${id}-base)`;

  let body = path(outline, face, edge, 1.4);
  const lit = `url(#${id}-lit)`;
  const inset = `url(#${id}-inset)`;
  const coat = `url(#${id}-coat)`;
  let lighting = `<g clip-path="url(#${id}-shape)">${path(litFaces[theme][index], lit)}</g>`;
  let decoration = path(detail, inset);
  let footing = path(feet[theme] ?? base, bevel, edge, 1.2);
  if (theme === "origami") {
    footing += path("M19 70L40 69L61 70L58 74L40 75L22 74Z", inset)
      + path("M25 63L40 66L55 63", "none", glint, .9);
  } else if (theme === "ancient-ruins") {
    footing += path("M22 68L58 68L62 70H18Z", lit) + path("M47 70L50 74H61V71L58 70Z", inset);
  } else if (theme === "toy" || theme === "steampunk") {
    footing += path("M24 67Q40 69 56 67", "none", edge, 1);
  }

  switch (theme) {
    case "haunted":
      if (draped) {
        body = path(outline, face, edge, 1.2);
        decoration = path(detail, inset) + eyes(ghostEyes[index]);
      } else {
        body = `<g fill="${face}" stroke="${edge}" stroke-width="1.25">${classicProfile.body.replaceAll("BEVEL", bevel).replaceAll("EYE", glint)}</g>`;
        lighting = "";
        decoration = piece === "r" ? "" : path(hatBands[index], "none", edge, 5.6)
          + path(witchHats[index], coat, edge, 1.15)
          + path(hatBands[index], "none", glint, 1.35);
        if (piece === "k") decoration += path("M41 13V25 M37 17H45", "none", accent, 2.2);
      }
      break;
    case "ocean-reef":
      decoration = path(detail, white || team ? coat : `url(#${id}-coral)`, white ? edge : "#50303b", .8);
      if (white) {
        decoration += path("M37 54q1-2 2 0m5 4q1-2 2 0m-10 4q1-2 2 0", "none", dark, 1.8);
      }
      if (piece === "n") decoration += path("M32 27Q35 24 38 26Q36 29 32 27Z", white ? edge : "#afced2");
      break;
    case "fossil":
      decoration = path(detail, piece === "n" ? inset : coat);
      if (piece === "n") decoration += path("M23 40Q31 40 36 35L42 34Q37 41 32 42L27 44Z", lit);
      if (!white) {
        decoration += path("M31 61Q35 56 46 55L50 56Q38 58 36 62Z M35 51Q40 49 47 48L48 49Q43 51 36 53Z", lit);
      }
      break;
    case "steampunk":
      decoration = path(detail, bevel, edge, 1);
      if (piece === "n") decoration += `<circle cx="45" cy="50" r="6.8" fill="${edge}"/><circle cx="45" cy="49.4" r="5.1" fill="${bevel}"/><circle cx="45" cy="49.4" r="2" fill="${accent}"/>`;
      if (piece === "r") decoration += path("M29 29H33V38L31 40H29Z M48 29H52V40H50L48 38Z", coat, edge, .9);
      if (piece === "k") decoration += path("M36 27H44V31H36Z", bevel, edge, .8);
      break;
    case "neon-circuit":
      decoration = path(detail, "none", edge, 4.8) + path(detail, "none", accent, 2.05);
      if (piece === "n") decoration += path("M31 27H35", "none", glint, 1.8);
      break;
    case "origami":
      decoration = path(detail, inset);
      if (piece === "r") decoration += path("M24 35L40 37L56 35L51 40L40 38L29 41Z", coat);
      break;
    case "candy": {
      const stripes = ribbonPaths[index];
      lighting = "";
      decoration = white || team
        ? `<g clip-path="url(#${id}-shape)">${path(stripes, "none", `url(#${id}-ribbon)`, 5.6)}${path(outline, `url(#${id}-glaze)`)}</g>`
        : path("M31 61Q40 64 49 61", "none", accent, 2.4);
      decoration += path(litFaces[theme][index], lit) + path(detail, "none", glint, 1.25);
      decoration += path("M25 67q15 4 30 0", "none", white ? "#ffe7d4" : glint, 1.15);
      if (piece === "n") decoration += path("M45 17Q61 25 58 43", "none", white ? "#fff1dc" : accent, 1.6);
      break;
    }
    case "toy":
      decoration = path(detail, white ? toyPaint[index] : accent, edge, .55) + path("M26 67H54", "none", white ? "#bc8751" : "#dea86d", 1.6);
      if (piece === "n") decoration += path("M32 27Q35 24 38 26Q36 30 32 27Z", edge);
      if (piece === "k") decoration += path("M36 18H44V22H36Z", inset);
      if (piece === "r") decoration += path("M29 39H51", "none", glint, 1);
      break;
  }

  const curved = ["candy", "toy", "steampunk", "fossil", "ocean-reef", "haunted"].includes(theme);

  return `<svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">
    <defs>
      ${curved ? `<radialGradient id="${id}-face" cx=".34" cy=".32" r=".78">
        <stop stop-color="${light}"/><stop offset=".26" stop-color="${light}"/>
        <stop offset=".51" stop-color="${mid}"/><stop offset=".79" stop-color="${dark}"/>
        <stop offset="1" stop-color="${mid}"/>
      </radialGradient>` : `<linearGradient id="${id}-face" x2=".9" y2=".66">
        <stop stop-color="${light}"/><stop offset=".48" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/>
      </linearGradient>`}
      <linearGradient id="${id}-edge-light" gradientUnits="userSpaceOnUse" x1="27" y1="18" x2="52" y2="64">
        <stop stop-color="${glint}" stop-opacity=".9"/>
        <stop offset=".52" stop-color="${light}" stop-opacity=".34"/>
        <stop offset="1" stop-color="${glint}" stop-opacity=".58"/>
      </linearGradient>
      <linearGradient id="${id}-lit" x2=".8" y2=".6">
        <stop stop-color="${glint}" stop-opacity=".9"/><stop offset="1" stop-color="${light}" stop-opacity=".28"/>
      </linearGradient>
      <linearGradient id="${id}-inset" x2=".8" y2=".7">
        <stop stop-color="${theme === "haunted" && white ? "#b8b4c2" : edge}"/><stop offset="1" stop-color="${dark}"/>
      </linearGradient>
      <linearGradient id="${id}-coat" x2=".6" y2=".86">
        <stop stop-color="${light}"/><stop offset=".55" stop-color="${theme === "haunted" ? mid : accent}"/><stop offset="1" stop-color="${dark}"/>
      </linearGradient>
      ${theme === "ocean-reef" && !white && !team ? `<linearGradient id="${id}-coral" x2=".15" y2="1">
        <stop stop-color="${reefColors[index]}"/><stop offset=".45" stop-color="${reefColors[index]}"/>
        <stop offset="1" stop-color="#68424c"/>
      </linearGradient>` : ""}
      <linearGradient id="${id}-base" x1="0" y1="0" x2="0" y2="1">
        <stop stop-color="${mid}"/><stop offset=".23" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/>
      </linearGradient>
      <clipPath id="${id}-shape">${path(outline, "white")}</clipPath>
      ${theme === "candy" && (white || team) ? `<linearGradient id="${id}-ribbon" x2="1" y2=".17">
          <stop stop-color="${team ? dark : "#a22241"}"/><stop offset=".33" stop-color="${team ? accent : "#dc4660"}"/>
          <stop offset=".62" stop-color="${team ? dark : "#bb203f"}"/><stop offset="1" stop-color="${team ? edge : "#731d37"}"/>
        </linearGradient>
        <linearGradient id="${id}-glaze" x1="0" y1="0" x2="1" y2=".45">
          <stop stop-color="#fff8eb" stop-opacity=".18"/><stop offset=".39" stop-color="#fff8eb" stop-opacity=".29"/>
          <stop offset=".59" stop-color="#fff8eb" stop-opacity="0"/><stop offset="1" stop-color="#7a2542" stop-opacity=".27"/>
        </linearGradient>` : ""}
    </defs>
    <g class="redesigned-piece" stroke-linejoin="round" stroke-linecap="round">
      ${body}
      ${lighting}
      ${draped ? "" : footing}
      ${decoration}
      ${relief(theme, index, id)}
    </g>
  </svg>`;
}
