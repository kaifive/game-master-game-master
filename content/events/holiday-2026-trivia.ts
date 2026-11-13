import type { TriviaContent } from "@/lib/games";

const img = (name: string, alt: string) => ({ src: `/events/holiday-2026/${name}.svg`, alt });

/**
 * Easy holiday trivia for the party (spec 10): questions every age can get,
 * kept apart from the wushu questions (Khai, 2026-11-13). Each player gets 5
 * drawn at random from this pool.
 */
export const holidayTrivia: TriviaContent = {
  questionsPerPlay: 5,
  secondsPerQuestion: 10,
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
      id: "santa-home",
      prompt: "Where does Santa live?",
      choices: ["The South Pole", "The North Pole", "The Moon", "Hawaii"],
      answer: 1,
    },
    {
      id: "santa-suit",
      prompt: "What color is Santa's suit?",
      choices: ["Green", "Blue", "Red", "Purple"],
      answer: 2,
    },
    {
      id: "frosty",
      prompt: "Frosty the ___?",
      choices: ["Snowman", "Reindeer", "Elf", "Penguin"],
      answer: 0,
    },
    {
      id: "jingle",
      prompt: "Jingle ___, jingle all the way!",
      choices: ["Bells", "Balls", "Boots", "Bears"],
      answer: 0,
    },
    {
      id: "grinch",
      prompt: "What color is the Grinch?",
      choices: ["Blue", "Green", "Orange", "Pink"],
      answer: 1,
    },
    {
      id: "santa-snack",
      prompt: "What do kids leave out for Santa?",
      choices: ["Pizza", "Cookies and milk", "Carrots and soup", "Popcorn"],
      answer: 1,
    },
    {
      id: "sleigh",
      prompt: "What pulls Santa's sleigh?",
      choices: ["Horses", "Dogs", "Reindeer", "Penguins"],
      answer: 2,
    },
    {
      id: "candy-cane",
      prompt: "What colors is a classic candy cane?",
      choices: ["Red and white", "Green and gold", "Blue and white", "Pink and purple"],
      answer: 0,
    },
    {
      id: "gingerbread",
      prompt: "What kind of house do people build out of cookies?",
      choices: ["Sugar cottage", "Gingerbread house", "Cookie castle", "Candy cabin"],
      answer: 1,
    },
    {
      id: "hanukkah-nights",
      prompt: "How many nights does Hanukkah last?",
      choices: ["3", "5", "8", "12"],
      answer: 2,
    },
    {
      id: "new-year",
      prompt: "What date is New Year's Day?",
      choices: ["December 25", "December 31", "January 1", "February 14"],
      answer: 2,
    },
    {
      id: "santa-helpers",
      prompt: "Who makes the toys in Santa's workshop?",
      choices: ["Elves", "Gnomes", "Fairies", "Robots"],
      answer: 0,
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
      id: "tree-top",
      prompt: "What often goes on top of a Christmas tree?",
      image: img("star", "A gold star"),
      choices: ["A star", "A hat", "A sock", "A pumpkin"],
      answer: 0,
    },
    {
      id: "stocking",
      prompt: "What do people hang by the fireplace for Santa to fill?",
      choices: ["Gloves", "Stockings", "Hats", "Scarves"],
      answer: 1,
    },
  ],
};
