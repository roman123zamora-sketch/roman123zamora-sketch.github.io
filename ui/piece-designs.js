// Original 80 × 80 profiles, in pawn, knight, bishop, rook, queen, king order.
// Each pair describes the outer contour and the principal material detail.
const ghosts = [
 ["M20 69C27 62 31 55 33 49C26 44 27 33 33 29C36 26 44 26 48 30C54 36 54 44 47 49C49 57 53 64 60 69Q55 74 47 71Q39 75 31 72Q24 75 20 69Z","M44 47Q47 49 48 55Q51 66 57 70L47 71Q42 61 44 47Z"],
 ["M16 41Q14 39 20 35L28 27Q30 20 37 16L40 8Q43 6 46 11L49 16Q60 22 61 36Q61 48 53 59Q57 64 62 69Q56 74 48 72Q39 76 30 72Q23 74 18 69Q25 64 30 57Q37 46 41 34L32 39Q27 46 22 47Z","M47 16Q57 24 55 38Q53 50 45 59Q47 66 56 71L48 72Q43 69 39 61Q51 43 47 16Z"],
 ["M18 69Q28 63 32 50L33 45Q26 43 26 37Q28 25 39 9Q44 10 48 20L39 30L51 24Q57 36 53 41L47 45Q51 62 62 69Q57 74 47 72Q38 75 30 72Q23 74 18 69Z","M31 43Q40 48 49 42L47 48Q39 52 33 48Z M45 50Q47 64 56 70L48 72Q39 65 45 50Z"],
 ["M17 69Q22 65 25 61L27 44Q21 42 21 36V21Q21 17 27 17H31L33 24Q35 27 38 24L38 19Q39 16 45 17L47 24Q49 27 51 24L53 18Q60 16 60 22V35Q59 42 53 44L55 61Q58 66 63 69Q59 74 49 72Q40 76 30 72Q23 74 17 69Z","M26 39Q39 45 54 39L52 46Q39 50 28 45Z M50 46L54 61Q59 67 60 70L50 72Q47 60 50 46Z"],
 ["M17 69Q27 63 32 50L33 46Q26 43 24 36L18 23Q17 18 22 19L32 28L37 16Q39 11 43 13L49 28L58 19Q64 16 63 23L56 37Q54 44 47 46L49 52Q55 63 63 69Q57 74 49 72Q40 75 31 72Q23 74 17 69Z","M26 35Q39 43 54 35Q53 43 47 46Q39 51 32 46Z M44 49Q48 66 56 70L49 72Q39 65 44 49Z"],
 ["M17 69Q27 64 32 51L34 46Q26 43 26 34L28 26L22 23Q20 18 24 16L34 15L36 8Q38 2 43 5L46 15L56 16Q61 17 59 22L52 26L54 34Q56 43 47 46L48 52Q53 63 63 69Q58 74 48 72Q39 76 30 72Q23 74 17 69Z","M44 16Q48 25 48 32Q50 41 44 46Q42 61 54 70L48 72Q39 65 39 56Q38 49 42 43Q47 34 44 16Z"]
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
 ["M21 68Q31 61 33 50Q26 46 26 39Q26 27 37 26Q52 24 54 37Q56 45 48 49Q48 60 59 68Q55 74 40 74Q24 74 21 68Z","M29 35Q34 29 43 32Q50 34 49 41Q42 37 35 42Z"],
 ["M21 67Q32 60 38 38Q33 43 28 44L21 47L14 42Q12 39 17 36L27 27Q30 20 36 18L38 10Q43 11 46 17Q55 18 59 29Q64 46 53 62L59 68Q53 74 39 74Q25 74 21 67Z","M52 55Q53 46 51 42L47 37Q45 33 49 32L54 37Q56 29 51 24Q47 21 49 18Q52 16 56 23L57 15Q58 12 61 14Q65 22 61 33L66 29Q70 27 70 31L62 40Q62 50 55 56Z"],
 ["M22 67Q31 61 33 47Q24 44 27 35Q30 24 39 12Q44 11 49 23L42 30L52 27Q58 42 47 48Q49 61 59 67Q54 74 40 74Q26 74 22 67Z","M31 38Q36 42 40 37Q42 34 44 37Q47 42 52 37Q51 46 42 47Q33 46 31 38Z"],
 ["M19 68L25 62L28 42Q22 40 22 34L21 22Q22 16 29 17Q32 18 32 24L35 27L37 19Q39 15 44 17L46 26L49 25L51 18Q56 15 59 20L58 35Q57 40 52 43L55 62L61 68Q57 75 40 75Q24 75 19 68Z","M29 40Q41 45 53 38L52 46Q43 52 31 47Z"],
 ["M20 68Q29 63 32 49Q25 46 24 39L19 26Q17 20 21 18Q25 16 29 24L34 31L36 17Q37 11 41 11Q45 12 46 18L47 31L53 23Q56 16 60 18Q65 20 61 26L55 39Q54 46 48 50Q50 62 60 68Q57 75 40 75Q24 75 20 68Z","M27 37Q34 41 38 35L40 19L43 34Q47 40 54 36Q52 46 41 48Q30 47 27 37Z"],
 ["M21 68Q31 62 33 49Q26 45 26 36Q26 26 36 24L36 19L28 18Q26 16 28 12L36 11L37 6Q39 2 43 5L45 12L52 11Q56 13 53 18L45 19V24Q55 27 55 35Q55 45 47 49Q49 62 59 68Q54 75 40 75Q26 75 21 68Z","M32 35Q35 29 40 27L41 9L43 15L50 14L43 17L43 27Q49 30 50 36Q41 41 32 35Z"]
];

const fossil = [
 ["M21 68Q30 60 32 49Q25 44 26 37Q26 27 34 26Q38 25 40 29Q44 24 49 28Q57 33 53 42Q52 47 48 49Q50 61 59 68L55 73Q40 77 25 73Z","M29 39Q37 47 49 38L47 47Q40 52 33 47Z"],
 ["M20 68Q23 61 31 57Q27 53 35 48L40 44L43 36L37 40L29 46L22 47L13 43Q11 39 17 36L26 29L30 21Q34 16 41 15L45 9L50 16Q59 18 61 27Q63 36 55 42L58 47L54 52L57 58L53 62L60 68L57 74H23Z","M33 26Q38 20 44 23Q49 25 45 30Q42 34 37 32Q33 31 33 26Z M19 38L29 33L36 34L29 40L22 42Z M33 53Q41 49 53 49L51 53L32 57Z M29 61Q39 57 53 56L51 60L28 65Z"],
 ["M21 68Q31 60 32 48Q26 45 26 38Q26 31 34 24L39 12Q41 10 43 13L49 23L40 32L52 28Q58 41 50 46L47 48Q49 60 59 68L55 74H25Z","M29 40Q39 48 51 39L48 47Q39 52 32 47Z"],
 ["M18 68L24 60L26 42Q21 39 21 34L22 21Q23 16 29 18L32 24L36 24L37 19Q39 15 44 17L46 24L50 24L52 18Q58 16 59 22L59 34Q59 39 54 42L56 60L62 68L59 74H21Z","M24 33Q39 39 56 33L53 41Q40 46 27 41Z"],
 ["M20 68Q30 61 31 49Q26 46 24 39L18 24Q17 19 22 18L33 31L36 18Q37 12 42 12L47 31L56 19Q62 16 63 22L56 39Q54 46 49 49Q50 61 60 68L56 74H24Z","M26 38Q40 45 55 37L51 46Q41 53 30 46Z"],
 ["M20 68Q30 62 32 49Q26 44 26 35Q26 26 35 24L36 19L29 19Q26 17 28 13L36 12L36 7Q37 3 42 4Q46 5 45 11L52 12Q56 15 53 19L45 19V24Q54 27 55 35Q55 44 48 49Q50 62 60 68L56 74H24Z","M29 39Q40 46 52 38L49 47Q40 53 32 47Z"]
];

const ruins = [
 ["M18 74V67L24 63H29L32 49L26 44V34L34 27H46L54 34V44L48 49L51 63H56L62 67V74Z","M26 34L34 27H46L51 31L37 32L32 38V44L26 44Z M44 50L48 49L51 63H45Z"],
 ["M17 74V67L24 63L27 53L39 43L43 34L33 39L26 47L18 46L13 41L25 29L31 20L38 17L41 8L49 14L57 17L64 31L61 48L53 61L59 64L63 68V74Z","M44 16L56 20L61 32L58 47L50 61H41L50 45L54 32Z M29 30L39 24L41 26L33 33Z"],
 ["M18 74V67L26 62H29L32 46L25 40L29 28L39 9L50 22L40 32L53 27L56 39L48 46L51 62L60 65L62 68V74Z","M39 10L43 16L34 33V42L40 46L39 62H29L32 46L25 40L29 28Z"],
 ["M16 74V68L23 63L26 43L20 37V18H30V25H35V17H45V25H50V18H60V37L54 43L57 63L64 68V74Z","M20 18H30V25H35V17H45V21H39V30H25V37H20Z M27 39H53L50 44H30Z M35 64V52L40 48L45 52V64Z"],
 ["M17 74V68L24 63L31 48L26 42L19 21L25 19L34 31L37 14L42 10L46 15L47 31L55 19L62 21L55 42L49 48L55 63L63 68V74Z","M25 21L34 36L39 16L42 14L39 39L35 43L28 39Z M42 45L49 48L55 63H45Z"],
 ["M17 74V68L24 63H28L31 46L25 41V29L35 22V17H27V10H35V4H45V10H53V17H45V22L55 29V41L49 46L52 63H56L63 68V74Z","M35 4H42V8L39 11V24L32 30V39L37 46L37 63H28L31 46L25 41V29L35 22V17H27V10H35Z"]
];

const steam = [
 ["M18 72V67L23 64H30V58H34V46L27 42V34Q27 27 40 26Q53 27 53 34V42L46 46V58H50V64H57L62 67V72L58 75H22Z","M28 36H52V42L46 46H34L28 42Z M35 48H45V57H35Z"],
 ["M17 72V67L25 62L29 53L39 43L44 34L36 36L27 46L18 46L13 41L25 28L31 20L39 17L42 8L48 12L54 17Q64 20 65 32L61 46L54 56V62L62 67V72L58 75H22Z","M46 17L55 21Q63 25 61 35L58 43L50 50L38 49L45 36L51 32Z M28 28L36 23L40 25L33 31Z"],
 ["M18 72V67L25 63H30V54H34V46L27 42V35L34 29L37 25L37 16L41 11L46 18V27L50 31L53 41L46 46V54H50V63H55L62 67V72L58 75H22Z","M32 36L48 23L52 26L38 40H32Z M34 46H46V50H34Z"],
 ["M17 72V67L24 63H28V45L22 40V23L27 20H31V27H36V18H44V27H49V20H53L58 23V40L52 45V63H56L63 67V72L59 75H21Z","M23 34H57V39L52 44H28L23 39Z M32 47H48V60H32Z"],
 ["M18 72V67L25 63L31 48L25 43L18 25L24 21L34 31L36 22L34 17L40 11L46 17L44 22L46 31L56 21L62 25L55 43L49 48L55 63L62 67V72L58 75H22Z","M28 36L35 33H45L52 36V42L46 46H34L28 42Z M35 48H45V61H35Z"],
 ["M17 72V67L24 63H30V54H34V45L26 40V31L34 25H37V18H28V11H36V5H44V11H52V18H43V25H46L54 31V40L46 45V54H50V63H56L63 67V72L59 75H21Z","M30 33H50V39L45 42H35L30 39Z M35 47H45V53H35Z"]
];

const circuit = [
 ["M18 70L24 64L30 61L34 48L26 42V34L33 26H47L54 34V42L46 48L50 61L56 64L62 70L58 75H22Z","M33 38H47L50 35"],
 ["M17 70L23 64L28 54L40 45L43 34L34 37L27 46H18L12 42L24 28L30 20L38 16L41 8L48 13L55 16L64 25V39L57 52L52 62L59 65L63 70L59 75H21Z","M22 40L31 34H40L50 25V20"],
 ["M17 70L24 64L30 60L33 47L26 42V34L38 11H43L50 24L40 34L53 28L56 38L51 44L47 48L50 60L56 64L63 70L59 75H21Z","M33 38H38L48 29"],
 ["M16 70L22 64H26V43L20 38V20H30V27H35V18H45V27H50V20H60V38L54 43V64H58L64 70L60 75H20Z","M27 32H37L42 36H53"],
 ["M17 70L24 64L30 60L33 48L25 43L18 23H25L33 31L37 14H43L47 31L55 23H62L55 43L47 48L50 60L56 64L63 70L59 75H21Z","M27 33L32 39H47L53 33"],
 ["M17 70L24 64L30 60L33 48L26 43V33L33 25H37V18H28V11H37V5H43V11H52V18H43V25H47L54 33V43L47 48L50 60L56 64L63 70L59 75H21Z","M33 37H47M40 30V43"]
];

const origami = [
 ["M18 70L29 61L35 47L26 39L29 31L39 24L50 30L54 39L45 47L51 61L62 70L55 74L40 76L24 74Z","M39 24L39 39L26 39L35 47L40 51L29 61L18 70L40 69V76L55 74L62 70L51 61L45 47L54 39L39 39Z"],
 ["M17 70L25 62L32 50L44 31L33 38L27 46L12 41L25 28L33 21L40 18L42 8L51 17L59 20L65 32L61 45L54 61L63 70L58 74L39 76L23 74Z","M42 8L47 23L34 21Z M12 41L31 31L39 25L44 31L33 38L27 46Z M50 20L58 33L45 47L32 50L25 62L17 70L39 69V76L58 74L63 70L54 61L61 45L65 32L59 20Z"],
 ["M18 70L27 62L32 51L34 45L25 40L39 10L54 35L49 45L48 51L54 62L62 70L55 74L40 76L24 74Z","M39 10V30L25 40L47 32L54 35L49 45L34 45L41 51L27 62L18 70L40 69V76L55 74L62 70L54 62L48 51L49 45L38 40L42 35Z"],
 ["M16 69L23 62L27 44L21 37V19L31 24L35 30L37 17H43L46 30L50 24L59 19V37L53 44L57 62L64 69L58 74L40 76L22 74Z","M21 19L29 32L40 36L51 32L59 19V37L52 42L40 39L27 44L21 37Z M40 39L53 44L57 62L64 69L58 74L40 76Z"],
 ["M17 70L26 62L31 48L24 43L17 21L33 31L40 12L47 31L63 21L56 43L49 48L54 62L63 70L56 74L40 76L24 74Z","M17 21L30 38L40 43L51 38L63 21L56 43L49 48L40 44L31 48L24 43Z M40 12L47 31L40 43Z M40 45L49 48L54 62L63 70L56 74L40 76Z"],
 ["M17 70L26 62L31 51L34 46L25 40L29 29L36 24V18H26V12L36 13L38 4L44 7V13L54 12V18H44V24L51 29L55 40L46 46L49 51L54 62L63 70L56 74L40 76L24 74Z","M26 12L40 15L54 12V18L40 17L26 18Z M38 4L44 7V24L51 29L55 40L46 46L49 51L54 62L63 70L56 74L40 76L39 51L40 45L32 40L40 34Z"]
];

const candy = [
 ["M18 69Q18 65 25 62Q32 59 33 49Q24 45 25 37Q26 25 39 25Q52 25 54 37Q55 45 47 49Q48 59 55 62Q62 65 62 69Q62 75 56 75H24Q18 75 18 69Z","M29 37Q30 28 40 28"],
 ["M17 69Q17 65 24 62Q29 54 38 46Q43 39 43 33Q38 34 33 41Q28 48 22 47L16 44Q12 42 16 36L26 27Q30 20 36 17L41 9Q46 6 49 16Q59 18 63 29Q69 44 54 62Q63 65 63 69Q63 75 57 75H23Q17 75 17 69Z","M20 38L30 27Q33 21 40 20"],
 ["M17 69Q17 65 24 62Q31 59 33 48Q24 44 26 36Q30 22 39 12Q42 9 45 14L50 23L40 32L53 27Q57 36 54 43Q52 47 47 48Q49 59 56 62Q63 65 63 69Q63 75 57 75H23Q17 75 17 69Z","M29 36Q33 25 40 18"],
 ["M17 69Q17 65 24 62L26 43Q21 40 21 34V23Q21 17 27 17Q33 17 33 23V25H36V21Q36 16 40 16Q44 16 44 21V25H47V23Q47 17 53 17Q59 17 59 23V34Q59 40 54 43L56 62Q63 65 63 69Q63 75 57 75H23Q17 75 17 69Z","M25 23V34Q25 38 29 39"],
 ["M17 69Q17 65 24 62Q31 59 33 48Q27 46 25 40L18 26Q15 20 21 17Q26 15 30 22L34 30L35 18Q36 11 41 11Q47 12 47 18L48 30L52 22Q56 15 61 17Q66 20 62 26L55 40Q53 46 47 48Q49 59 56 62Q63 65 63 69Q63 75 57 75H23Q17 75 17 69Z","M26 36Q32 41 40 41"],
 ["M17 69Q17 65 24 62Q31 59 33 48Q25 45 25 36Q25 27 35 25V19H30Q25 19 25 14Q25 9 30 9H35V7Q35 2 40 2Q45 2 45 7V9H50Q55 9 55 14Q55 19 50 19H45V25Q55 27 55 36Q55 45 47 48Q49 59 56 62Q63 65 63 69Q63 75 57 75H23Q17 75 17 69Z","M29 35Q31 28 37 28"]
];

const toy = [
 ["M18 69Q18 64 25 62H30L33 50Q24 46 25 38Q25 27 38 25Q53 24 55 37Q56 46 47 50L50 62H55Q62 64 62 69V71Q62 75 57 75H23Q18 75 18 71Z","M26 39Q40 44 54 39Q54 46 47 50H33Q27 47 26 39Z"],
 ["M17 69Q17 64 25 62L31 51L40 41L42 33L34 37L27 46Q22 50 16 47Q11 45 13 40L23 29Q28 20 37 16L41 9Q45 6 49 15Q59 18 63 29Q68 45 54 62Q63 64 63 69V71Q63 75 58 75H22Q17 75 17 71Z","M46 16Q59 20 62 32Q64 47 53 61H46Q56 45 56 35Q56 24 46 16Z"],
 ["M17 69Q17 64 25 62Q31 58 33 47Q25 42 26 36Q27 28 38 12Q41 8 44 13L51 23L41 32L53 27Q59 41 49 47Q50 58 56 62Q63 64 63 69V71Q63 75 58 75H22Q17 75 17 71Z","M31 45Q40 50 49 45L48 50Q40 55 32 50Z"],
 ["M16 69Q16 64 23 63H26V45Q20 42 20 37V22Q20 17 25 17H31V25H36V17H44V25H49V17H55Q60 17 60 22V37Q60 42 54 45V63H57Q64 64 64 69V71Q64 75 59 75H21Q16 75 16 71Z","M20 35Q40 38 60 35V38Q59 43 54 45H26Q21 43 20 38Z"],
 ["M17 69Q17 64 24 62Q31 57 33 48Q26 45 24 38L17 25Q15 21 20 18Q25 16 29 22L34 31L35 18Q36 12 41 11Q47 12 47 18L48 31L52 22Q55 16 60 18Q65 20 63 25L56 38Q54 45 48 48Q50 57 56 62Q63 64 63 69V71Q63 75 58 75H22Q17 75 17 71Z","M24 35Q40 43 56 35L53 43Q47 49 40 49Q31 48 27 43Z"],
 ["M17 69Q17 64 24 62Q31 57 33 48Q25 45 25 37Q25 28 35 25V19H30Q25 19 25 14Q25 10 30 10H35V7Q35 3 40 3Q45 3 45 7V10H50Q55 10 55 14Q55 19 50 19H45V25Q55 28 55 37Q55 45 47 48Q49 57 56 62Q63 64 63 69V71Q63 75 58 75H22Q17 75 17 71Z","M27 38Q40 44 53 38L50 45Q40 51 30 45Z M27 13H53V17H27Z"]
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
  "M38 16Q42 13 44 9Q47 3 53 6L56 10Q51 8 51 12L54 18Q60 19 57 22Q50 24 39 20Q37 19 38 16Z",
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
  const footing = theme === "haunted" && !draped ? path(base, bevel, edge, 1.2) : "";
  const shoulder = "M23 65Q39 69 57 65L56 69Q39 73 24 69Z";
  const hasFooting = !["haunted", "origami", "candy"].includes(theme);
  const foundation = hasFooting ? `<g clip-path="url(#${id}-shape)">${path(shoulder, bevel)}</g>` : "";

  switch (theme) {
    case "haunted":
      if (draped) {
        body = path(outline, face, edge, 1.2);
        decoration = path(detail, inset) + eyes(ghostEyes[index]);
      } else {
        body = `<g fill="${face}" stroke="${edge}" stroke-width="1.25">${classicProfile.body.replaceAll("BEVEL", bevel).replaceAll("EYE", glint)}</g>`;
        lighting = "";
        decoration = piece === "r" ? "" : `<g transform="translate(0 1.8)" opacity=".65">${path(hatBands[index], "none", edge, 5.6)}</g>`
          + path(witchHats[index], coat, edge, 1.15)
          + path(hatBands[index], "none", glint, 1.35);
        if (piece === "k") decoration += path("M41 13V25 M37 17H45", "none", accent, 2.2);
      }
      break;
    case "ocean-reef":
      decoration = path(detail, white || team ? coat : `url(#${id}-coral)`, white ? dark : edge, .65);
      if (piece === "n") decoration = `<g transform="translate(-.9 1.25)">${path(detail, dark)}</g>` + decoration;
      if (white) {
        decoration += path("M37 54q1-2 2 0m5 4q1-2 2 0m-10 4q1-2 2 0", "none", dark, 1.5);
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
      if (piece === "p") decoration += `<circle cx="50" cy="35" r="2" fill="${accent}"/>`;
      if (piece === "r") decoration += `<circle cx="53" cy="36" r="2" fill="${accent}"/>`;
      if (piece === "n") decoration += path("M31 27H35", "none", glint, 1.8);
      break;
    case "origami":
      decoration = path(detail, `url(#${id}-fold)`);
      if (piece === "r") decoration += path("M24 35L40 37L56 35L51 40L40 38L29 41Z", coat);
      break;
    case "candy": {
      const stripes = ribbonPaths[index];
      lighting = "";
      decoration = white || team
        ? `<g clip-path="url(#${id}-shape)">${path(stripes, "none", `url(#${id}-ribbon)`, 5.6)}${path(outline, `url(#${id}-glaze)`)}</g>`
        : path("M31 61Q40 64 49 61", "none", accent, 2.4);
      decoration += path(litFaces[theme][index], lit) + path(detail, "none", glint, 1.25);
      decoration += path("M25 69q15 4 30 0", "none", white ? "#ffe7d4" : glint, 1.15);
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
      ${theme === "origami" ? `<linearGradient id="${id}-fold" x2=".78" y2=".8">
        <stop stop-color="${mid}"/><stop offset=".47" stop-color="${dark}"/><stop offset="1" stop-color="${edge}"/>
      </linearGradient>` : ""}
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
      ${footing}
      ${foundation}
      ${decoration}
    </g>
  </svg>`;
}
