const LEVELS = [

  {
    generators: '',
    map: `W....1..`,
  },

  {
    generators: 'WW',
    map: `W..1.2.W`,
  },

  {
    generators: '',
    map: `..1..
          .1..S`,
  },

  {
    generators: '',
    map: `S..1.
          ..2..
          .1..S`,
  },

  {
    generators: '',
    map: `....W
          .11..
          .1.1.
          ....S`,
  },

  {
    generators: 'WWS',
    map: `W...W
          .221.
          .2.1.
          ....S`,
  },

  {
    generators: 'WWSS',
    map: `W...W
          ..31.
          .2.1.
          ..21.
          S...S`,
  },

  {
    generators: 'WWSS',
    map: `W...W
          ..21.
          .2#1.
          ..21.
          S...S`,
  },

  {
    generators: '',
    map: `S.....S
          ..2.1..
          .1.1.1.
          ..2.2..
          W.....W`,
  },


  // Night levels

  {
    generators: 'WB',
    hasNight: true,
    map: `.W
          1.
          ..
          1B
          ..`,
  },

  {
    generators: '',
    hasNight: true,
    map: `.WB..
          ...1.
          ...1.
          .112.
          ....W`,
  },

  {
    generators: 'WWSS',
    hasNight: true,
    map: `W.W..
          1..21
          2..#1
          1..21
          S.S.B`,
  },

];
