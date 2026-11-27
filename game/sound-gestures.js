// Voices are dry tonal sweeps or colored noise, with a separate contact in the mixer.
const tone = (at, duration, from, to, gain, pan = 0) => ({ at, duration, from, to, gain, pan });
const texture = (at, duration, color, gain, pan = 0, flutter = 0) =>
  ({ at, duration, color, gain, pan, flutter });

const gestures = {
  plastic: {
    lift: [tone(0, .036, 480, 720, .023)], land: [texture(.016, .044, "soft", .065)],
    check: [tone(0, .14, 730, 660, .105)],
    win: [tone(0, .16, 392, 392, .18), tone(.17, .19, 494, 494, .18), tone(.38, .59, 587, 587, .19)],
    loss: [tone(0, .5, 440, 392, .16), texture(.56, .12, "dry", .08)],
    draw: [tone(0, .26, 440, 440, .13, -.48), tone(.28, .26, 440, 440, .13, .48), tone(.59, .33, 440, 440, .12)]
  },
  nature: {
    lift: [texture(0, .076, "dry", .14, 0, 26)], land: [texture(.008, .08, "soft", .08)],
    check: [tone(0, .13, 1170, 2100, .11), tone(.081, .087, 1830, 2390, .079)],
    win: [tone(0, .43, 139, 123, .16), tone(.31, .28, 950, 1750, .11, -.36), texture(.49, .82, "dry", .19, 0, 10), tone(1.12, .49, 1860, 1150, .12, .4)],
    loss: [texture(.0, .43, "dry", .13, 0, 19), texture(.37, .1, "edge", .24), texture(.44, .84, "dry", .17, .16, 11)],
    draw: [tone(0, .39, 1510, 1020, .11, -.58), texture(.2, 1.36, "soft", .23), tone(.73, .46, 1050, 1530, .11, .58)]
  },
  metal: {
    lift: [texture(0, .071, "edge", .12, 0, 38)], land: [tone(.012, .112, 175, 162, .11), tone(.017, .09, 889, 881, .049)],
    check: [tone(0, .15, 1746, 1720, .14)],
    win: [tone(0, .37, 162, 153, .26), texture(0, .07, "edge", .22), texture(.43, .1, "edge", .28), texture(.63, .09, "edge", .27), tone(.64, .77, 513, 506, .25), tone(.65, .63, 829, 824, .13)],
    loss: [tone(0, .38, 81, 74, .31), texture(0, .23, "edge", .20, 0, 27), texture(.38, .34, "edge", .15, .22, 18), tone(.75, .42, 118, 88, .13)],
    draw: [tone(0, 1.45, 333, 331, .17, -.58), tone(.12, 1.33, 336, 334, .17, .58), texture(1.39, .09, "soft", .08)]
  },
  volcanic: {
    lift: [texture(0, .085, "dry", .17, 0, 21), tone(0, .065, 119, 94, .055)], land: [texture(.004, .14, "steam", .28, 0, 18)],
    check: [texture(0, .19, "steam", .29), texture(.14, .05, "edge", .13)],
    win: [tone(0, .56, 61, 89, .29), texture(.29, .14, "edge", .27), texture(.47, 1.5, "steam", .39, 0, 12), texture(1.24, .11, "dry", .24, -.23), texture(1.49, .13, "dry", .22, .2)],
    loss: [texture(0, .32, "steam", .26), texture(.32, .65, "edge", .25, 0, 19), tone(.93, .34, 201, 86, .16), texture(1.18, .23, "dry", .16)],
    draw: [texture(0, .94, "steam", .26, -.54), texture(.45, .92, "steam", .26, .54), tone(1.27, .22, 180, 93, .15), tone(1.55, .23, 155, 71, .12)]
  },
  "ocean-reef": {
    lift: [tone(0, .069, 230, 620, .097)], land: [texture(.009, .095, "soft", .15), tone(.036, .084, 290, 490, .065)],
    check: [tone(0, .17, 810, 610, .17)],
    win: [texture(0, .89, "soft", .29), tone(.4, .23, 210, 410, .14, -.24), tone(.69, .27, 380, 820, .15, .2), tone(1.04, .26, 580, 1190, .13), texture(1.3, .49, "steam", .26)],
    loss: [texture(0, .17, "edge", .18), tone(.28, .27, 480, 210, .16), tone(.58, .37, 300, 114, .14), texture(.9, .44, "soft", .22)],
    draw: [texture(0, 1.21, "soft", .3, -.52), texture(.29, 1.21, "soft", .3, .52), tone(.93, .72, 124, 124, .13)]
  },
  haunted: {
    lift: [tone(0, .083, 212, 129, .09), texture(.01, .064, "soft", .10)], land: [tone(.016, .115, 148, 118, .11)],
    check: [tone(0, .134, 1480, 990, .12), texture(.07, .1, "soft", .11)],
    win: [texture(0, .4, "soft", .24), tone(.33, 1.34, 132, 130, .23), tone(.34, .98, 319, 319, .14), tone(.86, .9, 247, 247, .12), tone(.9, .83, 370, 370, .12)],
    loss: [tone(0, .48, 226, 120, .14), texture(.41, .155, "dry", .27), tone(.56, .61, 68, 62, .12), texture(.73, .43, "soft", .13)],
    draw: [tone(0, 1.77, 222, 222, .16, -.32), tone(.17, 1.6, 225, 225, .16, .32), texture(.72, 1.2, "soft", .15)]
  },
  "ancient-ruins": {
    lift: [texture(0, .082, "dry", .17, 0, 25)], land: [texture(.011, .096, "dry", .16, .09, 32)],
    check: [tone(0, .16, 131, 96, .23), tone(.095, .13, 116, 92, .086)],
    win: [tone(0, .67, 78, 74, .29), tone(.57, 1.45, 431, 445, .18), texture(1.36, .4, "dry", .21, .22, 11), tone(1.65, .44, 93, 85, .11)],
    loss: [texture(0, .09, "edge", .14), texture(.17, .11, "dry", .16), texture(.34, .65, "dry", .3, 0, 17), texture(.73, .9, "soft", .22)],
    draw: [texture(0, .83, "dry", .25, -.5, 16), texture(.39, .83, "dry", .25, .5, 17), tone(1.08, .7, 110, 94, .17)]
  },
  steampunk: {
    lift: [texture(0, .083, "edge", .14, 0, 48)], land: [texture(.008, .08, "edge", .14, 0, 41), tone(.058, .053, 191, 142, .085)],
    check: [tone(0, .125, 1160, 1480, .13), texture(.112, .065, "edge", .13)],
    win: [texture(0, .77, "edge", .24, -.13, 20), texture(.44, .44, "dry", .23, .13, 39), tone(.82, .75, 133, 198, .23), tone(1.53, .44, 920, 540, .14)],
    loss: [texture(0, .5, "edge", .22, 0, 25), texture(.47, .4, "dry", .23, 0, 13), tone(.71, .4, 219, 99, .14), texture(1.02, .45, "steam", .17)],
    draw: [texture(0, .86, "edge", .18, -.48, 18), texture(.12, .86, "edge", .18, .48, 18), texture(.92, .74, "steam", .24)]
  },
  "neon-circuit": {
    lift: [tone(0, .047, 880, 1650, .055)], land: [tone(.008, .066, 665, 498, .18)],
    check: [tone(0, .062, 880, 880, .165), tone(.076, .082, 960, 1210, .16)],
    win: [tone(0, .71, 142, 330, .19, -.21), tone(.07, .64, 828, 660, .13, .28), tone(.58, .7, 330, 330, .19), tone(.59, .69, 495, 495, .14), tone(.62, .66, 660, 660, .13)],
    loss: [tone(0, .21, 540, 480, .18), tone(.28, .14, 465, 415, .15), tone(.49, .08, 430, 380, .13), tone(.66, .31, 899, 870, .08)],
    draw: Array.from({length: 5}, (_, i) => tone(i * .267, i === 4 ? .30 : .16, 440, 440, .15, i === 4 ? 0 : i % 2 ? .65 : -.65))
  },
  "stained-glass": {
    lift: [tone(0, .063, 521, 620, .057), texture(0, .051, "soft", .092)], land: [tone(.013, .126, 1320, 1295, .104), tone(.017, .105, 1588, 1580, .043)],
    check: [tone(0, .16, 1530, 1500, .159)],
    win: [tone(0, 1.96, 349, 349, .18), tone(.06, 1.75, 440, 440, .16, -.32), tone(.13, 1.46, 523, 523, .14, .32), tone(.17, 1.04, 880, 883, .12)],
    loss: [tone(0, .73, 646, 646, .18), texture(.55, .31, "edge", .24, .16, 29), tone(.79, .28, 1319, 1050, .14), tone(1.16, .37, 116, 87, .16)],
    draw: [tone(0, 1.76, 527, 527, .18, -.57), tone(.04, 1.72, 530, 530, .18, .57)]
  },
  origami: {
    lift: [texture(0, .075, "dry", .18, 0, 17)], land: [texture(0, .083, "dry", .25, 0, 27), texture(.045, .047, "edge", .11)],
    check: [texture(0, .13, "edge", .26, 0, 14)],
    win: [texture(0, .21, "dry", .32, -.2, 13), texture(.26, .23, "edge", .24, .18, 14), texture(.54, .84, "dry", .38, 0, 12)],
    loss: [texture(0, .33, "soft", .26, -.1, 11), texture(.29, .31, "dry", .29, .1, 15), texture(.6, .55, "edge", .34, 0, 20)],
    draw: [texture(0, .78, "dry", .26, -.61, 11), texture(.13, .78, "dry", .26, .61, 12), texture(.82, .65, "dry", .27, 0, 17)]
  },
  candy: {
    lift: [tone(0, .065, 320, 890, .087)], land: [texture(.008, .085, "edge", .13, 0, 32)],
    check: [texture(0, .16, "edge", .24, 0, 35), tone(.066, .08, 927, 570, .12)],
    win: [texture(0, .38, "dry", .28, 0, 27), tone(.51, .15, 430, 780, .18), tone(.87, .13, 650, 980, .17), tone(1.03, .17, 815, 1180, .16), texture(.98, .5, "edge", .22, 0, 36)],
    loss: [tone(0, .79, 200, 780, .16), texture(.68, .14, "edge", .23), texture(.81, .34, "soft", .26)],
    draw: [texture(0, 1.32, "edge", .24, -.53, 24), texture(.08, 1.26, "edge", .24, .53, 26)]
  },
  cosmic: {
    lift: [texture(0, .09, "soft", .19), tone(0, .076, 112, 220, .068)], land: [tone(.01, .114, 177, 111, .18), tone(.041, .098, 824, 790, .042)],
    check: [tone(0, .171, 874, 510, .15)],
    win: [tone(0, .94, 133, 198, .16, -.42), tone(.57, 1.69, 198, 198, .19), tone(.64, 1.57, 297, 297, .15, .37), tone(.85, 1.31, 395, 395, .14, -.24), tone(1.31, .76, 791, 791, .1)],
    loss: [tone(0, 1.21, 338, 120, .17, -.46), tone(.15, 1.12, 470, 141, .13, .46), tone(1.12, .6, 110, 55, .21)],
    draw: [tone(0, 1.95, 176, 176, .17, -.58), tone(.08, 1.87, 264, 264, .17, .58), texture(.29, 1.5, "soft", .12)]
  },
  toy: {
    lift: [tone(0, .066, 503, 191, .11)], land: [tone(.015, .095, 420, 191, .076), texture(.04, .04, "dry", .077)],
    check: [tone(0, .116, 570, 1220, .16)],
    win: [texture(0, .27, "dry", .2, 0, 20), texture(.31, .24, "edge", .19, 0, 23), tone(.63, .19, 159, 117, .23), tone(.85, .14, 166, 131, .22), tone(1.02, .14, 182, 148, .22), tone(1.21, .33, 622, 233, .16)],
    loss: [tone(0, .25, 205, 148, .2), tone(.44, .25, 187, 129, .19), tone(.76, .21, 492, 102, .16), texture(.93, .32, "dry", .27)],
    draw: [texture(0, .65, "dry", .23, -.42, 14), texture(.25, .65, "dry", .23, .42, 15), tone(.89, .56, 294, 126, .19)]
  },
  fossil: {
    lift: [texture(0, .083, "dry", .19, 0, 19)], land: [texture(.02, .1, "dry", .19, 0, 31), tone(.025, .077, 311, 247, .076)],
    check: [tone(0, .16, 282, 208, .17), texture(0, .037, "edge", .11)],
    win: [texture(0, .24, "dry", .29, -.23), texture(.29, .24, "dry", .29, .23), texture(.59, .25, "dry", .29), texture(.89, .63, "edge", .27, 0, 16), tone(1.27, .67, 262, 243, .23)],
    loss: [texture(0, .41, "edge", .23, 0, 14), tone(.37, .55, 182, 97, .16), texture(.62, .93, "dry", .25, 0, 19)],
    draw: [texture(0, .83, "dry", .26, -.54, 14), texture(.27, .83, "dry", .26, .54, 14), tone(1.06, .39, 194, 135, .16), texture(1.26, .49, "soft", .21)]
  }
};

const pieceWeight = { p: 0, n: 1, b: 2, r: 3, q: 4, k: 5, light: 0, mid: 2, heavy: 5 };
const heatSeconds = [.101, .146, .166, .216, .291, .323];
const moveFactor = [.75, .89, 1, 1.1, 1.22, 1.32];
const piecePitch = [1.12, .99, 1.06, .78, .9, .68];

function scale(voices, time, volume, pitch = 1, offset = 0) {
  return voices.map(voice => ({
    ...voice, at: offset + voice.at * time, duration: voice.duration * time, gain: voice.gain * volume,
    from: voice.from && voice.from * pitch, to: voice.to && voice.to * pitch
  }));
}

export function soundLayers(name, finish, variant) {
  const design = gestures[finish];
  const [event, piece] = name.split("-");
  const weight = pieceWeight[piece] ?? 2;
  const variation = [.96, 1.02, 1, 1.045][variant];
  const pitch = piecePitch[weight] * variation;
  const volcanic = finish === "volcanic";
  const land = (at = 0, index = weight) => {
    const layers = scale(design.land, moveFactor[index], 1, piecePitch[index] * variation, at);
    if (volcanic) {
      layers[0].duration = heatSeconds[index] - .004;
      if (index >= 3) layers.push(tone(at + .058, heatSeconds[index] * .69, 183, 73, .09));
    }
    return layers;
  };
  switch (event) {
    case "lift": return scale(design.lift, moveFactor[weight] * variation, 1, pitch);
    case "move": return land();
    case "capture": return [...scale(design.lift, .45, 1.48), ...land(.019)];
    case "castle": return [...land(0, 5), ...land(.073, 3)];
    case "promote": return [...scale(design.lift, .78, 1.05), ...scale(design.check, .68, .62, 1.12, .041)];
    case "wrong": return scale(design.land, .31, .67, .78);
    case "reseat": return scale(design.land, .64, .33, .92);
    case "clock": return scale(design.check, .25, .58, 1.08);
    case "setup": return [...scale(design.lift, 1.15, .66), ...land(.055, 0).map(voice => ({...voice, gain: voice.gain * .58}))];
    case "offer": return [...scale(design.lift, .52, .74), ...scale(design.lift, .48, .56, .83, .065)];
    case "hover": return scale(design.lift, .46, .34, 1.03);
    case "button": return scale(design.lift, .42, .69, .87);
    case "focus": return scale(design.lift, .46, .22, 1.03);
    case "stalemate": return [...design.draw, ...scale(design.lift, .44, .48, .88, Math.max(...design.draw.map(v => v.at + v.duration)) - .07)];
    default: return design[event] ?? [];
  }
}
