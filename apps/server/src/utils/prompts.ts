import type { ContentCategory, ContentIntensity, TruthDarePromptItem } from '@chaos/shared';

export const BUILTIN_TRUTH_DARE_PROMPTS: TruthDarePromptItem[] = [
  // TRUTHS — Chill / Lighthearted / Funny
  {
    id: 'td-t-1',
    type: 'truth',
    text: 'What is the most ridiculous thing you have ever searched on the internet?',
    category: 'funny',
    intensity: 'chill',
    source: 'builtin',
    approved: true,
  },
  {
    id: 'td-t-2',
    type: 'truth',
    text: 'What song do you secretly sing at the top of your lungs when nobody is around?',
    category: 'lighthearted',
    intensity: 'chill',
    source: 'builtin',
    approved: true,
  },
  {
    id: 'td-t-3',
    type: 'truth',
    text: 'If you had to swap lives with someone in this room for a week, who would it be and why?',
    category: 'friendship',
    intensity: 'chill',
    source: 'builtin',
    approved: true,
  },
  {
    id: 'td-t-4',
    type: 'truth',
    text: 'What is a completely harmless lie you told that spiraled way out of control?',
    category: 'embarrassing',
    intensity: 'medium',
    source: 'builtin',
    approved: true,
  },
  {
    id: 'td-t-5',
    type: 'truth',
    text: 'Who in this room takes the longest to text back, and what is their worst excuse?',
    category: 'friendship',
    intensity: 'medium',
    source: 'builtin',
    approved: true,
  },
  {
    id: 'td-t-6',
    type: 'truth',
    text: 'What is the most embarrassing thing that happened to you in class or at work?',
    category: 'university',
    intensity: 'medium',
    source: 'builtin',
    approved: true,
  },
  {
    id: 'td-t-7',
    type: 'truth',
    text: 'Have you ever pretended to like a gift or a meal just to be polite? Tell the full story.',
    category: 'funny',
    intensity: 'chill',
    source: 'builtin',
    approved: true,
  },
  {
    id: 'td-t-8',
    type: 'truth',
    text: 'What is one goal or dream you have never told anyone in this room about?',
    category: 'deep',
    intensity: 'medium',
    source: 'builtin',
    approved: true,
  },
  {
    id: 'td-t-9',
    type: 'truth',
    text: 'Who was your very first celebrity or school crush, and did anyone ever find out?',
    category: 'relationships',
    intensity: 'spicy',
    source: 'builtin',
    approved: true,
  },
  {
    id: 'td-t-10',
    type: 'truth',
    text: 'If someone in this room read your last 5 sent messages out loud, how much trouble would you be in?',
    category: 'embarrassing',
    intensity: 'spicy',
    source: 'builtin',
    approved: true,
  },

  // DARES — Chill / Medium / Spicy (always safe & consensual)
  {
    id: 'td-d-1',
    type: 'dare',
    text: 'Speak in a dramatic movie-trailer voice for the next two rounds.',
    category: 'funny',
    intensity: 'chill',
    source: 'builtin',
    approved: true,
  },
  {
    id: 'td-d-2',
    type: 'dare',
    text: 'Give every person in the room a genuine, weirdly specific compliment.',
    category: 'friendship',
    intensity: 'chill',
    source: 'builtin',
    approved: true,
  },
  {
    id: 'td-d-3',
    type: 'dare',
    text: 'Do your best 15-second impression of another player in the room without naming them.',
    category: 'creative',
    intensity: 'medium',
    source: 'builtin',
    approved: true,
  },
  {
    id: 'td-d-4',
    type: 'dare',
    text: 'Show the group the last photo you took on your phone (if safe) or describe it in vivid detail.',
    category: 'embarrassing',
    intensity: 'medium',
    source: 'builtin',
    approved: true,
  },
  {
    id: 'td-d-5',
    type: 'dare',
    text: 'Hum the chorus of a famous song until at least two players guess it correctly.',
    category: 'lighthearted',
    intensity: 'chill',
    source: 'builtin',
    approved: true,
  },
  {
    id: 'td-d-6',
    type: 'dare',
    text: 'Type a message in the room chat using only emojis to explain your weekend.',
    category: 'creative',
    intensity: 'chill',
    source: 'builtin',
    approved: true,
  },
  {
    id: 'td-d-7',
    type: 'dare',
    text: 'Let the group choose a new nickname for you in the room for the rest of the session.',
    category: 'funny',
    intensity: 'medium',
    source: 'builtin',
    approved: true,
  },
  {
    id: 'td-d-8',
    type: 'dare',
    text: 'Confess an unpopular food opinion and defend it like a courtroom lawyer for 20 seconds.',
    category: 'creative',
    intensity: 'medium',
    source: 'builtin',
    approved: true,
  },
  {
    id: 'td-d-9',
    type: 'dare',
    text: 'Send a completely wholesome "You are awesome" text to the 3rd person in your recent chats.',
    category: 'relationships',
    intensity: 'spicy',
    source: 'builtin',
    approved: true,
  },
  {
    id: 'td-d-10',
    type: 'dare',
    text: 'Act out a 10-second silent acceptance speech as if you just won an Oscar for Best Chaos.',
    category: 'funny',
    intensity: 'spicy',
    source: 'builtin',
    approved: true,
  },
];

export const MOST_LIKELY_TO_PROMPTS = [
  'Who is most likely to become accidentally famous on TikTok?',
  'Who is most likely to forget their own birthday?',
  'Who is most likely to survive a zombie apocalypse?',
  'Who is most likely to reply "on my way" while still in bed?',
  'Who is most likely to adopt five stray animals?',
  'Who is most likely to win a reality TV show?',
  'Who is most likely to laugh at the worst possible moment?',
  'Who is most likely to start a group chat and immediately mute it?',
];

export const NEVER_HAVE_I_EVER_PROMPTS = [
  'Never have I ever pretended to understand a joke just to fit in.',
  'Never have I ever stayed up past 4 AM talking to friends.',
  'Never have I ever sent a message to the wrong group chat.',
  'Never have I ever binge-watched an entire season in one weekend.',
  'Never have I ever waved back at someone who was waving at the person behind me.',
  'Never have I ever blamed lag for losing a game.',
  'Never have I ever rehearsed an argument in the shower.',
  'Never have I ever forgotten someone’s name two seconds after meeting them.',
];

export const WOULD_YOU_RATHER_PROMPTS: Array<{ question: string; a: string; b: string }> = [
  {
    question: 'Would you rather...',
    a: 'Always have to speak in rhymes',
    b: 'Always have to sing everything you say',
  },
  {
    question: 'Would you rather...',
    a: 'Never use social media again',
    b: 'Never watch movies or TV shows again',
  },
  {
    question: 'Would you rather...',
    a: 'Know every language fluently',
    b: 'Be able to talk to animals',
  },
  {
    question: 'Would you rather...',
    a: 'Have a rewind button for your life',
    b: 'Have a pause button for your life',
  },
  {
    question: 'Would you rather...',
    a: 'Live without music',
    b: 'Live without your favorite food',
  },
];

export const HOT_TAKES_PROMPTS = [
  'Pineapple belongs on pizza, and people who disagree are afraid of joy.',
  'Voice notes longer than 60 seconds should be illegal.',
  'Breakfast food tastes 10x better at night.',
  'Movie trailers spoil way too much and should be 30 seconds max.',
  'Cold pizza the next morning is elite.',
  'Small talk is overrated; we should skip straight to deep questions.',
];

export const QUICK_QUIZ_PACK: Array<{
  question: string;
  options: Array<{ id: string; label: string }>;
  correctOptionId: string;
}> = [
  {
    question: 'Which planet in our solar system has the most moons?',
    options: [
      { id: 'a', label: 'Jupiter' },
      { id: 'b', label: 'Saturn' },
      { id: 'c', label: 'Uranus' },
      { id: 'd', label: 'Neptune' },
    ],
    correctOptionId: 'b',
  },
  {
    question: 'What does "HTTP" stand for?',
    options: [
      { id: 'a', label: 'HyperText Transfer Protocol' },
      { id: 'b', label: 'High Transmission Text Process' },
      { id: 'c', label: 'Hyperlink Terminal Transport Path' },
      { id: 'd', label: 'Host Transfer Text Protocol' },
    ],
    correctOptionId: 'a',
  },
  {
    question: 'Which animal is known as the only mammal capable of true sustained flight?',
    options: [
      { id: 'a', label: 'Flying Squirrel' },
      { id: 'b', label: 'Sugar Glider' },
      { id: 'c', label: 'Bat' },
      { id: 'd', label: 'Colugo' },
    ],
    correctOptionId: 'c',
  },
  {
    question: 'In music, how many keys are on a standard full-size piano?',
    options: [
      { id: 'a', label: '76' },
      { id: 'b', label: '84' },
      { id: 'c', label: '88' },
      { id: 'd', label: '92' },
    ],
    correctOptionId: 'c',
  },
  {
    question: 'Which element has the chemical symbol "Au"?',
    options: [
      { id: 'a', label: 'Silver' },
      { id: 'b', label: 'Gold' },
      { id: 'c', label: 'Argon' },
      { id: 'd', label: 'Aluminum' },
    ],
    correctOptionId: 'b',
  },
];

export function filterPromptsBySettings(
  prompts: TruthDarePromptItem[],
  intensity: ContentIntensity,
  categories: ContentCategory[]
): TruthDarePromptItem[] {
  const allowedIntensities =
    intensity === 'chill'
      ? ['chill']
      : intensity === 'medium'
        ? ['chill', 'medium']
        : ['chill', 'medium', 'spicy', 'custom'];

  const filtered = prompts.filter(
    (p) =>
      p.approved &&
      allowedIntensities.includes(p.intensity) &&
      (categories.includes('custom') || categories.includes(p.category))
  );

  return filtered.length > 0 ? filtered : prompts.filter((p) => p.approved);
}
