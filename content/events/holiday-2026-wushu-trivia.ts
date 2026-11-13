import type { TriviaContent } from "@/lib/games";

/**
 * Wushu trivia for the party (Khai, 2026-11-13). The club facts are Khai's;
 * the rule codes come from the IWUF 2024 rules in the Wushu Toolkit
 * (deduction codes and nandu codes). Each player gets 5 drawn at random from 30.
 */
export const wushuTrivia: TriviaContent = {
  questionsPerPlay: 5,
  // Codes take a moment's thought.
  secondsPerQuestion: 15,
  questions: [
    {
      id: "wall-silhouettes",
      prompt: "How many silhouettes are on the wall at Nova Wushu?",
      choices: ["8", "9", "10", "12"],
      answer: 2,
    },
    {
      id: "floor-size",
      prompt: "How big is a standard wushu taolu floor?",
      choices: ["10 × 10 m", "12 × 12 m", "14 × 8 m", "20 × 10 m"],
      answer: 2,
    },
    {
      id: "school-floors",
      prompt: "How many wushu floors has Nova Wushu had?",
      choices: ["1", "2", "3", "4"],
      answer: 2,
    },
    {
      id: "us-team",
      prompt: "How many times has a Nova Wushu athlete (including Coach) made the US team?",
      choices: ["10", "15", "20", "25"],
      answer: 2,
    },
    {
      id: "spear-abbreviation",
      prompt: "What's the abbreviation for spear?",
      choices: ["QS", "GS", "DS", "JS"],
      answer: 0,
    },
    {
      id: "gs-weapon",
      prompt: "Which weapon is GS?",
      choices: ["Staff", "Spear", "Broadsword", "Straight sword"],
      answer: 0,
    },
    {
      id: "cat-stance-code",
      prompt: "What's the deduction code for cat stance?",
      choices: ["50", "51", "52", "53"],
      answer: 2,
    },
    {
      id: "horse-stance-code",
      prompt: "What's the deduction code for horse stance?",
      choices: ["50", "51", "52", "54"],
      answer: 1,
    },
    {
      id: "bow-stance-code",
      prompt: "What's the deduction code for bow stance?",
      choices: ["50", "51", "53", "58"],
      answer: 0,
    },
    {
      id: "tornado-360-code",
      prompt: "What's the nandu code for a 360° tornado kick?",
      choices: ["312A", "323A", "324A", "333A"],
      answer: 1,
    },
    {
      id: "jump-outside-360-code",
      prompt: "What's the nandu code for a 360° jump outside kick?",
      choices: ["323A", "324A", "335A", "353B"],
      answer: 1,
    },
    {
      id: "butterfly-code",
      prompt: "What's the nandu code for a butterfly?",
      choices: ["333A", "335A", "353B", "312A"],
      answer: 0,
    },
    {
      id: "cartwheel-code",
      prompt: "What's the nandu code for an aerial?",
      choices: ["323A", "333A", "335A", "355B"],
      answer: 2,
    },
    {
      id: "ma-bu",
      prompt: "Which stance is Mǎ Bù?",
      choices: ["Bow stance", "Horse stance", "Crouching stance", "Empty stance"],
      answer: 1,
    },
    {
      id: "jian",
      prompt: "Which one is the straight sword?",
      choices: ["Dao", "Gun", "Jian", "Qiang"],
      answer: 2,
    },
    {
      id: "fall-deduction",
      prompt: "How much is the deduction for a fall?",
      choices: ["0.1", "0.2", "0.3", "0.5"],
      answer: 2,
    },
    {
      id: "fall-code",
      prompt: "What's the deduction code for a fall?",
      choices: ["70", "71", "72", "75"],
      answer: 2,
    },
    {
      id: "dropped-weapon",
      prompt: "How much is the deduction for dropping your weapon?",
      choices: ["0.1", "0.2", "0.3", "0.5"],
      answer: 2,
    },
    {
      id: "out-of-bounds",
      prompt: "How much is the deduction for stepping out of bounds?",
      choices: ["0.05", "0.1", "0.2", "0.3"],
      answer: 1,
    },
    {
      id: "music-lyrics",
      prompt: "In an event with music, how much is the deduction for music with lyrics?",
      choices: ["0.1", "0.2", "0.3", "0.5"],
      answer: 3,
    },
    {
      id: "drop-stance-code",
      prompt: "What's the deduction code for drop stance?",
      choices: ["50", "51", "53", "54"],
      answer: 2,
    },
    {
      id: "front-sweep-code",
      prompt: "What's the deduction code for a front sweep?",
      choices: ["20", "21", "23", "26"],
      answer: 0,
    },
    {
      id: "butterfly-deduction-code",
      prompt: "What's the deduction code for a butterfly?",
      choices: ["30", "32", "33", "34"],
      answer: 2,
    },
    {
      id: "butterfly-twist-code",
      prompt: "What's the nandu code for a 360° butterfly twist?",
      choices: ["333A", "353B", "353C", "355B"],
      answer: 1,
    },
    {
      id: "front-sweep-540-code",
      prompt: "What's the nandu code for a 540° front sweep?",
      choices: ["244A", "244B", "312A", "111A"],
      answer: 0,
    },
    {
      id: "easiest-grade",
      prompt: "Which nandu grade is the easiest?",
      choices: ["A", "B", "C", "D"],
      answer: 0,
    },
    {
      id: "nq",
      prompt: "What does NQ stand for?",
      choices: ["Nanquan", "Nandao", "Nangun", "Changquan"],
      answer: 0,
    },
    {
      id: "tjj",
      prompt: "What does TJJ stand for?",
      choices: ["Taiji fist", "Taiji sword", "Taiji fan", "Taiji staff"],
      answer: 1,
    },
    {
      id: "pu-bu",
      prompt: "Which stance is Pū Bù?",
      choices: ["Horse stance", "Bow stance", "Drop stance", "Cat stance"],
      answer: 2,
    },
    {
      id: "changquan-meaning",
      prompt: "What does Changquan mean?",
      choices: ["Long Fist", "Southern Fist", "Tiger Fist", "Drunken Fist"],
      answer: 0,
    },
  ],
};
