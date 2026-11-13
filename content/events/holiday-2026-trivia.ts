import type { TriviaContent } from "@/lib/games";

const img = (name: string, alt: string) => ({ src: `/events/holiday-2026/${name}.svg`, alt });

/**
 * Easy holiday trivia for the party (spec 10): questions every age can get,
 * kept apart from the wushu questions (Khai, 2026-11-13). Each player gets 5
 * drawn at random from this pool of 30 (Khai, 2026-11-13: about 30).
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
      choices: ["Bells", "Bows", "Boots", "Bears"],
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
      choices: ["A star", "A hat", "A sock", "A pumpkin"],
      answer: 0,
    },
    {
      id: "stocking",
      prompt: "What do people hang by the fireplace for Santa to fill?",
      choices: ["Gloves", "Stockings", "Hats", "Scarves"],
      answer: 1,
    },
    {
      id: "mistletoe",
      prompt: "Which plant do people kiss under at Christmas?",
      choices: ["Mistletoe", "Holly", "Ivy", "Cactus"],
      answer: 0,
    },
    {
      id: "not-a-mouse",
      prompt: "'Twas the night before Christmas, not a creature was stirring, not even a ___",
      choices: ["Cat", "Mouse", "Dog", "Reindeer"],
      answer: 1,
    },
    {
      id: "santa-laugh",
      prompt: "What does Santa say when he laughs?",
      choices: ["Ha ha ha!", "Hee hee hee!", "Ho ho ho!", "Tee hee!"],
      answer: 2,
    },
    {
      id: "under-tree",
      prompt: "What do people put under the Christmas tree?",
      choices: ["Shoes", "Presents", "Snow", "Pillows"],
      answer: 1,
    },
    {
      id: "twelve-days",
      prompt: "How many days of Christmas are in the song?",
      choices: ["5", "10", "12", "25"],
      answer: 2,
    },
    {
      id: "grinch-dog",
      prompt: "What is the name of the Grinch's dog?",
      choices: ["Max", "Rex", "Buddy", "Spot"],
      answer: 0,
    },
    {
      id: "tree-kind",
      prompt: "What kind of tree is a Christmas tree usually?",
      choices: ["Oak", "Palm", "Pine", "Maple"],
      answer: 2,
    },
    {
      id: "olaf",
      prompt: "What is the name of the snowman in Frozen?",
      choices: ["Sven", "Olaf", "Kristoff", "Frosty"],
      answer: 1,
    },
    {
      id: "snowman-nose",
      prompt: "What is a snowman's nose usually made of?",
      choices: ["A carrot", "A banana", "A pinecone", "A cookie"],
      answer: 0,
    },
    {
      id: "marshmallows",
      prompt: "Which warm drink do people top with marshmallows?",
      choices: ["Orange juice", "Hot chocolate", "Lemonade", "Milkshake"],
      answer: 1,
    },
    {
      id: "frosty-hat",
      prompt: "What brought Frosty the Snowman to life?",
      choices: ["A magic scarf", "An old silk hat", "A shooting star", "A snow globe"],
      answer: 1,
    },
    {
      id: "gingerbread-man",
      prompt: "\"Run, run, as fast as you can! You can't catch me, I'm the ___!\"",
      choices: ["Snowman", "Gingerbread Man", "Candy Cane", "Nutcracker"],
      answer: 1,
    },
  ],
};
