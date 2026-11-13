import type { TriviaContent } from "@/lib/games";

/**
 * Wushu trivia for the party (Khai, 2026-11-13). The club facts are Khai's;
 * the rule codes come from the IWUF 2024 rules in the Wushu Toolkit
 * (deduction codes and nandu codes). Each player gets 5 drawn at random.
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
      prompt: "How many times have Nova Wushu athletes (and Coach) made the US team?",
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
      prompt: "What's the deduction code for cat stance (empty stance)?",
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
      id: "tornado-540-code",
      prompt: "What's the nandu code for a 540° tornado kick?",
      choices: ["323A", "323B", "324B", "353B"],
      answer: 1,
    },
    {
      id: "butterfly-code",
      prompt: "What's the nandu code for a butterfly kick?",
      choices: ["333A", "335A", "353B", "312A"],
      answer: 0,
    },
    {
      id: "cartwheel-code",
      prompt: "What's the nandu code for an aerial cartwheel?",
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
      id: "taolu-meaning",
      prompt: "What is taolu?",
      choices: ["Forms (routines)", "Sparring", "Stretching", "Weapons cleaning"],
      answer: 0,
    },
    {
      id: "jian",
      prompt: "Which one is the straight sword?",
      choices: ["Dao", "Gun", "Jian", "Qiang"],
      answer: 2,
    },
  ],
};
