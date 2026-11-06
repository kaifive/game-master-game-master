import type { TriviaContent } from "@/lib/games";

const img = (name: string, alt: string) => ({ src: `/events/holiday-2026/${name}.svg`, alt });

/**
 * Placeholder trivia for the party (spec 10, S10-AC7). Khai swaps in real
 * questions later. Each player gets 5 drawn at random from this pool.
 */
export const holidayTrivia: TriviaContent = {
  questionsPerPlay: 5,
  secondsPerQuestion: 15,
  questions: [
    {
      id: "snowflake-points",
      prompt: "How many points does a snowflake have?",
      choices: ["4", "5", "6", "8"],
      answer: 2,
    },
    {
      id: "red-nose",
      prompt: "Which reindeer has a red nose?",
      choices: ["Dasher", "Rudolph", "Comet", "Blitzen"],
      answer: 1,
    },
    {
      id: "canada-capital",
      prompt: "What is the capital of Canada?",
      choices: ["Toronto", "Vancouver", "Ottawa", "Montreal"],
      answer: 2,
    },
    {
      id: "wushu-country",
      prompt: "Which country does wushu come from?",
      choices: ["Japan", "China", "Korea", "Thailand"],
      answer: 1,
    },
    {
      id: "leap-year",
      prompt: "How many days are in a leap year?",
      choices: ["364", "365", "366", "367"],
      answer: 2,
    },
    {
      id: "near-sun",
      prompt: "Which planet is closest to the sun?",
      choices: ["Venus", "Mercury", "Mars", "Earth"],
      answer: 1,
    },
    {
      id: "blue-yellow",
      prompt: "Mix blue and yellow paint. What color do you get?",
      choices: ["Green", "Purple", "Orange", "Brown"],
      answer: 0,
    },
    {
      id: "spider-legs",
      prompt: "How many legs does a spider have?",
      choices: ["6", "8", "10", "12"],
      answer: 1,
    },
    {
      id: "bees",
      prompt: "What do bees make?",
      choices: ["Milk", "Silk", "Honey", "Wax paper"],
      answer: 2,
    },
    {
      id: "short-month",
      prompt: "Which month has the fewest days?",
      choices: ["January", "February", "April", "June"],
      answer: 1,
    },
    {
      id: "h2o",
      prompt: "What is H₂O better known as?",
      choices: ["Salt", "Air", "Water", "Sugar"],
      answer: 2,
    },
    {
      id: "big-ocean",
      prompt: "Which ocean is the largest?",
      choices: ["Atlantic", "Indian", "Arctic", "Pacific"],
      answer: 3,
    },
    {
      id: "wushu-meaning",
      prompt: "What does the Chinese word “wushu” mean?",
      choices: ["Martial arts", "Dragon dance", "Tea ceremony", "Kite flying"],
      answer: 0,
    },
    {
      id: "gun-weapon",
      prompt: "In wushu, what kind of weapon is a “gun”?",
      choices: [
        "A long wooden staff",
        "A spear with a tassel",
        "A double-edged sword",
        "A folding fan",
      ],
      answer: 0,
    },
    {
      id: "zodiac-2026",
      prompt: "Which zodiac animal is 2026, the next Lunar New Year?",
      choices: ["Dragon", "Snake", "Horse", "Goat"],
      answer: 2,
    },
    {
      id: "tree-holiday",
      prompt: "Which holiday is this tree usually for?",
      image: img("tree", "A pine tree with lights and a gold star on top"),
      choices: ["Christmas", "Halloween", "Easter", "Fourth of July"],
      answer: 0,
    },
    {
      id: "which-bell",
      prompt: "Which one is a bell?",
      choices: [
        { image: img("bell", "A gold bell") },
        { image: img("star", "A gold star") },
        { image: img("gift", "A red gift box") },
        { image: img("snowflake", "A white snowflake") },
      ],
      answer: 0,
    },
    {
      id: "melts-fastest",
      prompt: "Left out in the sun, which of these melts first?",
      choices: ["An ice cube", "A rock", "A metal spoon", "A brick"],
      answer: 0,
    },
    {
      id: "tallest-animal",
      prompt: "What is the tallest animal?",
      choices: ["Elephant", "Giraffe", "Horse", "Ostrich"],
      answer: 1,
    },
    {
      id: "rainbow-colors",
      prompt: "How many colors are in a rainbow?",
      choices: ["5", "6", "7", "8"],
      answer: 2,
    },
  ],
};
