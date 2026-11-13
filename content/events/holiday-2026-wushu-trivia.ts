import type { TriviaContent } from "@/lib/games";

/**
 * Wushu trivia for the party (Khai, 2026-11-13). The club facts are Khai's;
 * the rule codes come from the IWUF 2024 rules in the Wushu Toolkit
 * (deduction codes and nandu codes). Mostly beginner basics, with a few codes
 * (Khai, 2026-11-13: too many codes). Each player gets 5 drawn at random from 30.
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
      choices: ["16", "18", "20", "23"],
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
      id: "front-stance-code",
      prompt: "What's the deduction code for front stance?",
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
      choices: ["Front stance", "Horse stance", "Drop stance", "Cat stance"],
      answer: 1,
    },
    {
      id: "jian",
      prompt: "Which one is the straight sword?",
      choices: ["Dao", "Gun", "Jian", "Qiang"],
      answer: 2,
    },
    {
      id: "front-stance-shape",
      prompt: "Which stance has your front knee bent and your back leg straight?",
      choices: ["Front stance", "Horse stance", "Cat stance", "Drop stance"],
      answer: 0,
    },
    {
      id: "butterfly-shape",
      prompt: "Which jump spins your body flat in the air, legs flying out behind you?",
      choices: ["Butterfly", "Tornado kick", "Aerial", "Front kick"],
      answer: 0,
    },
    {
      id: "outside-kick-shape",
      prompt: "Which kick swings your straight leg in a big arc from inside to outside?",
      choices: ["Outside kick", "Front kick", "Side kick", "Snap kick"],
      answer: 0,
    },
    {
      id: "staff",
      prompt: "Which weapon is a long wooden pole?",
      choices: ["Staff", "Broadsword", "Straight sword", "Fan"],
      answer: 0,
    },
    {
      id: "sword-fingers",
      prompt: "Which hand shape keeps the index and middle fingers straight and together?",
      choices: ["Palm", "Fist", "Hook", "Sword fingers"],
      answer: 3,
    },
    {
      id: "pu-bu",
      prompt: "Which stance is Pū Bù?",
      choices: ["Horse stance", "Front stance", "Drop stance", "Cat stance"],
      answer: 2,
    },
    {
      id: "changquan-meaning",
      prompt: "What does Changquan mean?",
      choices: ["Long Fist", "Southern Fist", "Tiger Fist", "Drunken Fist"],
      answer: 0,
    },
    {
      id: "palm-fingers",
      prompt: "In a standing palm, your fingers point ___",
      choices: ["Up", "Down", "Left", "Right"],
      answer: 0,
    },
    {
      id: "fist-thumb",
      prompt: "When you make a fist, where does your thumb go?",
      choices: [
        "Pressed over your index and middle fingers",
        "Tucked inside the fist",
        "Sticking straight out",
        "Pointing up",
      ],
      answer: 0,
    },
    {
      id: "hook-hand",
      prompt: "Which hand shape has all five fingertips pinched together and the wrist bent?",
      choices: ["Palm", "Fist", "Hook", "Sword fingers"],
      answer: 2,
    },
    {
      id: "horse-thighs",
      prompt: "In horse stance, your thighs should be ___",
      choices: ["Parallel to the floor", "Straight up and down", "Crossed", "Touching"],
      answer: 0,
    },
    {
      id: "front-knee",
      prompt: "In front stance, your front knee should be right above your ___",
      choices: ["Front foot", "Back foot", "Hip", "Other knee"],
      answer: 0,
    },
    {
      id: "cat-weight",
      prompt: "Which stance has almost all your weight on your back leg?",
      choices: ["Front stance", "Horse stance", "Cat stance", "Drop stance"],
      answer: 2,
    },
    {
      id: "salute-when",
      prompt: "What do you do at the start and end of a routine?",
      choices: ["Salute", "Clap", "Jump", "Spin"],
      answer: 0,
    },
    {
      id: "salute-hands",
      prompt: "In the wushu salute, which hand makes the fist?",
      choices: ["Right", "Left", "Both", "Neither"],
      answer: 0,
    },
    {
      id: "longest-weapon",
      prompt: "Which of these weapons is the longest?",
      choices: ["Broadsword", "Straight sword", "Spear", "Fan"],
      answer: 2,
    },
  ],
};
