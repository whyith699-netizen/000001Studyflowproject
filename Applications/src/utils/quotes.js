/**
 * Collection of motivational quotes for study/work
 * Returns a quote based on the current day (changes daily)
 */

const quotes = [
  {
    text: "The secret of getting ahead is getting started.",
    author: "Mark Twain",
  },
  {
    text: "Believe you can and you're halfway there.",
    author: "Theodore Roosevelt",
  },
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
  },
  {
    text: "Success is not final, failure is not fatal: It is the courage to continue that counts.",
    author: "Winston Churchill",
  },
  {
    text: "Don't watch the clock; do what it does. Keep going.",
    author: "Sam Levenson",
  },
  {
    text: "The future belongs to those who believe in the beauty of their dreams.",
    author: "Eleanor Roosevelt",
  },
  {
    text: "It does not matter how slowly you go as long as you do not stop.",
    author: "Confucius",
  },
  {
    text: "Success is not how high you have climbed, but how you make a positive difference to the world.",
    author: "Roy T. Bennett",
  },
  {
    text: "Don't be pushed around by the fears in your mind. Be led by the dreams in your heart.",
    author: "Roy T. Bennett",
  },
  {
    text: "The only impossible journey is the one you never begin.",
    author: "Tony Robbins",
  },
  {
    text: "It always seems impossible until it’s done.",
    author: "Nelson Mandela",
  },
  {
    text: "Push yourself, because no one else is going to do it for you.",
    author: "Rhyanna Watson",
  },
  {
    text: "The expert in anything was once a beginner.",
    author: "Helen Hayes",
  },
  {
    text: "Dream it. Wish it. Do it.",
    author: "Isabela Reyes-Klein",
  },
  {
    text: "Success doesn't just find you. You have to go out and get it.",
    author: "Lydia Sweatt",
  },
  {
    text: "Genius is 1% inspiration, 99% perspiration.",
    author: "Thomas Edison",
  },
  {
    text: "The more that you learn, the more places you'll go.",
    author: "Dr. Seuss",
  },
  {
    text: "Don't stop when you're tired. Stop when you're done.",
    author: "David Goggins",
  },
  {
    text: "Wake up with determination. Go to bed with satisfaction.",
    author: "George Horace Lorimer",
  },
  {
    text: "Do something today that your future self will thank you for.",
    author: "Sean Patrick Flanery",
  },
  {
    text: "Live as if you were to die tomorrow. Learn as if you were to live forever.",
    author: "Mahatma Gandhi",
  },
  {
    text: "It's going to be hard, but hard does not mean impossible.",
    author: "Art Williams",
  },
  {
    text: "Don't wait for opportunity. Create it.",
    author: "George Bernard Shaw",
  },
  {
    text: "The roots of education are bitter, but the fruit is sweet.",
    author: "Aristotle",
  },
  {
    text: "The key to success is to start before you are ready.",
    author: "Marie Forleo",
  },
  {
    text: "You don't have to be great to start, but you have to start to be great.",
    author: "Zig Ziglar",
  },
  {
    text: "A year from now you may wish you had started today.",
    author: "Karen Lamb",
  },
  {
    text: "The only person you are destined to become is the person you decide to be.",
    author: "Ralph Waldo Emerson",
  },
  {
    text: "Go confidently in the direction of your dreams. Live the life you have imagined.",
    author: "Henry David Thoreau",
  },
  {
    text: "Act as if what you do makes a difference. It does.",
    author: "William James",
  },
  {
    text: "What you get by achieving your goals is not as important as what you become by achieving your goals.",
    author: "Zig Ziglar",
  },
];

/**
 * Get a quote based on the current day
 * The quote changes daily and is consistent throughout the day
 * @returns {{ text: string, author: string }}
 */
export const getQuoteOfTheDay = () => {
  const now = new Date();
  // Use year, month, and day to create a seed that changes daily
  const daySeed =
    now.getFullYear() * 1000 + (now.getMonth() + 1) * 100 + now.getDate();
  
  // Use modulo to select a quote based on the day seed
  const quoteIndex = daySeed % quotes.length;
  
  return quotes[quoteIndex];
};

/**
 * Get a random quote (for testing or manual refresh)
 * @returns {{ text: string, author: string }}
 */
export const getRandomQuote = () => {
  const randomIndex = Math.floor(Math.random() * quotes.length);
  return quotes[randomIndex];
};

export default { getQuoteOfTheDay, getRandomQuote, quotes };
