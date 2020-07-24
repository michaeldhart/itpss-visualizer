export interface LocalityStatisticSet {
    name: string;
    totalBenchmark: number;
    totalStops: number;
    white: RaceStatisticSet;
    black: RaceStatisticSet;
    hispanic: RaceStatisticSet;
}

interface RaceStatisticSet {
    benchmark: number;
    stops: number;
}

export const Data: LocalityStatisticSet[] = [
    {
        name: "Algonquin Police",
        totalBenchmark: 589331,
        totalStops: 3785,
        white: {
            benchmark: 411768,
            stops: 2877
        },
        black: {
            benchmark: 22557,
            stops: 203
        },
        hispanic: {
            benchmark: 132538,
            stops: 550,
        }
    },
    {
        name: "Arlington Heights Police",
        totalBenchmark: 1070935,
        totalStops: 12616,
        white: {
            benchmark: 686366,
            stops: 8243
        },
        black: {
            benchmark: 50944,
            stops: 862
        },
        hispanic: {
            benchmark: 210294,
            stops: 2249,
        }
    },
    {
        name: "Aurora Police",
        totalBenchmark: 1601471,
        totalStops: 21577,
        white: {
            benchmark: 1083507,
            stops: 5417
        },
        black: {
            benchmark: 109029,
            stops: 4915
        },
        hispanic: {
            benchmark: 281095,
            stops: 10390,
        }
    },
    {
        name: "Belvidere Police Department",
        totalBenchmark: 37855,
        totalStops: 5396,
        white: {
            benchmark: 29192,
            stops: 3186
        },
        black: {
            benchmark: 761,
            stops: 627
        },
        hispanic: {
            benchmark: 7312,
            stops: 1537,
        }
    },
    {
        name: "Boone County Sheriff",
        totalBenchmark: 37855,
        totalStops: 4969,
        white: {
            benchmark: 29192,
            stops: 3395,
        },
        black: {
            benchmark: 761,
            stops: 409,
        },
        hispanic: {
            benchmark: 7312,
            stops: 1103,
        }
    },
    {
        name: "Carpentersville Police",
        totalBenchmark: 368843,
        totalStops: 2939,
        white: {
            benchmark: 225664,
            stops: 1241,
        },
        black: {
            benchmark: 19637,
            stops: 409,
        },
        hispanic: {
            benchmark: 107445,
            stops: 1214,
        }
    },
    {
        name: "Cherry Valley Police",
        totalBenchmark: 201483,
        totalStops: 2533,
        white: {
            benchmark: 147766,
            stops: 1565,
        },
        black: {
            benchmark: 25175,
            stops: 543,
        },
        hispanic: {
            benchmark: 22741,
            stops: 6,
        }
    },
    {
        name: "Chicago Police",
        totalBenchmark: 1862966,
        totalStops: 598332,
        white: {
            benchmark: 661647,
            stops: 77339,
        },
        black: {
            benchmark: 567198,
            stops: 368332,
        },
        hispanic: {
            benchmark: 502903,
            stops: 132457,
        }
    },
    {
        name: "Elgin Police",
        totalBenchmark: 946801,
        totalStops: 12608,
        white: {
            benchmark: 587557,
            stops: 4805,
        },
        black: {
            benchmark: 38062,
            stops: 1849,
        },
        hispanic: {
            benchmark: 221649,
            stops: 5210,
        }
    },
    {
        name: "Forest Park Police",
        totalBenchmark: 299165,
        totalStops: 1228,
        white: {
            benchmark: 118376,
            stops: 295,
        },
        black: {
            benchmark: 48386,
            stops: 639,
        },
        hispanic: {
            benchmark: 123450,
            stops: 266,
        }
    },
    {
        name: "Freeport Police",
        totalBenchmark: 17010,
        totalStops: 2914,
        white: {
            benchmark: 12961,
            stops: 1854,
        },
        black: {
            benchmark: 3027,
            stops: 1013,
        },
        hispanic: {
            benchmark: 775,
            stops: 37,
        }
    },
    {
        name: "Freeport Park District Police",
        totalBenchmark: 17010,
        totalStops: 21,
        white: {
            benchmark: 12961,
            stops: 14,
        },
        black: {
            benchmark: 3027,
            stops: 7,
        },
        hispanic: {
            benchmark: 775,
            stops: 0,
        }
    },
    {
        name: "Glenview Police",
        totalBenchmark: 326084,
        totalStops: 1752,
        white: {
            benchmark: 233852,
            stops: 1752,
        },
        black: {
            benchmark: 15455,
            stops: 244,
        },
        hispanic: {
            benchmark: 26476,
            stops: 392,
        }
    },
    {
        name: "Hoffman Estates Police",
        totalBenchmark: 946801,
        totalStops: 12334,
        white: {
            benchmark: 587557,
            stops: 6220,
        },
        black: {
            benchmark: 36062,
            stops: 1299,
        },
        hispanic: {
            benchmark: 221649,
            stops: 2780,
        }
    },
    {
        name: "Joliet Police",
        totalBenchmark: 572024,
        totalStops: 9287,
        white: {
            benchmark: 392893,
            stops: 3597,
        },
        black: {
            benchmark: 58994,
            stops: 3098,
        },
        hispanic: {
            benchmark: 89420,
            stops: 2422,
        }
    },
    {
        name: "Loves Park Police",
        totalBenchmark: 239338,
        totalStops: 6554,
        white: {
            benchmark: 176958,
            stops: 4348,
        },
        black: {
            benchmark: 25936,
            stops: 1294,
        },
        hispanic: {
            benchmark: 30053,
            stops: 29,
        }
    },
    {
        name: "Marengo Police",
        totalBenchmark: 220488,
        totalStops: 1212,
        white: {
            benchmark: 186104,
            stops: 926,
        },
        black: {
            benchmark: 2920,
            stops: 57,
        },
        hispanic: {
            benchmark: 25093,
            stops: 199,
        }
    },
    {
        name: "McHenry County Sheriff",
        totalBenchmark: 220488,
        totalStops: 13561,
        white: {
            benchmark: 186104,
            stops: 10426,
        },
        black: {
            benchmark: 2920,
            stops: 593,
        },
        hispanic: {
            benchmark: 25093,
            stops: 2286,
        }
    },
    {
        name: "Oak Park Police",
        totalBenchmark: 299165,
        totalStops: 8385,
        white: {
            benchmark: 118376,
            stops: 2532,
        },
        black: {
            benchmark: 48386,
            stops: 4016,
        },
        hispanic: {
            benchmark: 123450,
            stops: 1609,
        }
    },
    {
        name: "Ogle County Sheriff",
        totalBenchmark: 37079,
        totalStops: 4346,
        white: {
            benchmark: 33130,
            stops: 3771,
        },
        black: {
            benchmark: 349,
            stops: 365,
        },
        hispanic: {
            benchmark: 3259,
            stops: 168,
        }
    },
    {
        name: "Oregon Police",
        totalBenchmark: 37079,
        totalStops: 682,
        white: {
            benchmark: 33130,
            stops: 610,
        },
        black: {
            benchmark: 349,
            stops: 45,
        },
        hispanic: {
            benchmark: 3259,
            stops: 24,
        }
    },
    {
        name: "Palatine Police",
        totalBenchmark: 577958,
        totalStops: 20836,
        white: {
            benchmark: 361893,
            stops: 17174,
        },
        black: {
            benchmark: 18425,
            stops: 811,
        },
        hispanic: {
            benchmark: 114204,
            stops: 2104,
        }
    },
    {
        name: "Park Ridge Police",
        totalBenchmark: 326084,
        totalStops: 3929,
        white: {
            benchmark: 233852,
            stops: 2964,
        },
        black: {
            benchmark: 15455,
            stops: 209,
        },
        hispanic: {
            benchmark: 26476,
            stops: 482,
        }
    },
    {
        name: "Rochelle Police",
        totalBenchmark: 37079,
        totalStops: 1033,
        white: {
            benchmark: 33130,
            stops: 707,
        },
        black: {
            benchmark: 349,
            stops: 80,
        },
        hispanic: {
            benchmark: 3259,
            stops: 230,
        }
    },
    {
        name: "Rockford Police",
        totalBenchmark: 102066,
        totalStops: 11192,
        white: {
            benchmark: 59111,
            stops: 4450,
        },
        black: {
            benchmark: 22311,
            stops: 5022,
        },
        hispanic: {
            benchmark: 16957,
            stops: 140,
        }
    },
    {
        name: "Rockton Police",
        totalBenchmark: 201483,
        totalStops: 1785,
        white: {
            benchmark: 147766,
            stops: 1298,
        },
        black: {
            benchmark: 25175,
            stops: 297,
        },
        hispanic: {
            benchmark: 22741,
            stops: 19,
        }
    },
    {
        name: "Rolling Meadows Police",
        totalBenchmark: 577958,
        totalStops: 2631,
        white: {
            benchmark: 361893,
            stops: 1472,
        },
        black: {
            benchmark: 18425,
            stops: 232,
        },
        hispanic: {
            benchmark: 114204,
            stops: 578,
        }
    },
    {
        name: "Roscoe Police",
        totalBenchmark: 201483,
        totalStops: 1969,
        white: {
            benchmark: 147766,
            stops: 1621,
        },
        black: {
            benchmark: 25175,
            stops: 175,
        },
        hispanic: {
            benchmark: 22741,
            stops: 13,
        }
    },
    {
        name: "Schaumburg Police",
        totalBenchmark: 1238562,
        totalStops: 22852,
        white: {
            benchmark: 826843,
            stops: 13728,
        },
        black: {
            benchmark: 48823,
            stops: 2119,
        },
        hispanic: {
            benchmark: 198434,
            stops: 3012,
        }
    },
    {
        name: "Stephenson County Sheriff",
        totalBenchmark: 32474,
        totalStops: 3022,
        white: {
            benchmark: 27928,
            stops: 2374,
        },
        black: {
            benchmark: 3136,
            stops: 529,
        },
        hispanic: {
            benchmark: 1101,
            stops: 78,
        }
    },
    {
        name: "Wheaton Police",
        totalBenchmark: 660604,
        totalStops: 11020,
        white: {
            benchmark: 464950,
            stops: 8117,
        },
        black: {
            benchmark: 30398,
            stops: 1265,
        },
        hispanic: {
            benchmark: 84230,
            stops: 1156,
        }
    },
    {
        name: "Winnebago County Sheriff",
        totalBenchmark: 201483,
        totalStops: 13550,
        white: {
            benchmark: 147766,
            stops: 8789,
        },
        black: {
            benchmark: 25175,
            stops: 3179,
        },
        hispanic: {
            benchmark: 22741,
            stops: 43,
        }
    }
];