import { questions } from './questions.js'

export const strictQuestions = [
  ...questions,
  {
    id: 'water', instruction: 'Fill in the blank',
    'text-prompt-available': true, 'audio-prompt': null,
    'text-prompt': 'They [[blank]] water after exercise.', answer: 'drink',
    translation: 'Beben agua después de hacer ejercicio.',
    options: [
      { id: 'drink', label: 'Drink', feedback: 'Correct! Use “drink” with liquids such as water.' },
      { id: 'eat', label: 'Eat', feedback: 'We eat food, but we drink water.' },
      { id: 'drinks', label: 'Drinks', feedback: 'With “they”, use “drink” without an -s.' },
    ],
  },
  {
    id: 'reading', instruction: 'Fill in the blank',
    'text-prompt-available': true, 'audio-prompt': null,
    'text-prompt': 'He is [[blank]] a book right now.', answer: 'reading',
    translation: 'Está leyendo un libro ahora mismo.',
    options: [
      { id: 'read', label: 'Read', feedback: 'After “is”, use the -ing form to describe an action happening now.' },
      { id: 'reads', label: 'Reads', feedback: '“He reads” describes a habit. “He is reading” describes what is happening now.' },
      { id: 'reading', label: 'Reading', feedback: 'Exactly! “Is reading” is the present continuous.' },
    ],
  },
  {
    id: 'apple', instruction: 'Fill in the blank',
    'text-prompt-available': true, 'audio-prompt': null,
    'text-prompt': 'I have [[blank]] apple in my bag.', answer: 'an',
    translation: 'Tengo una manzana en mi bolso.',
    options: [
      { id: 'a', label: 'A', feedback: '“Apple” begins with a vowel sound, so use “an”.' },
      { id: 'an', label: 'An', feedback: 'Great! Use “an” before a vowel sound, as in “an apple”.' },
      { id: 'some', label: 'Some', feedback: '“Apple” is singular here. Use “an apple”, or “some apples” for more than one.' },
    ],
  },
  {
    id: 'tomorrow', instruction: 'Fill in the blank',
    'text-prompt-available': true, 'audio-prompt': null,
    'text-prompt': 'We [[blank]] visit our friends tomorrow.', answer: 'will',
    translation: 'Visitaremos a nuestros amigos mañana.',
    options: [
      { id: 'did', label: 'Did', feedback: '“Did” refers to the past. “Tomorrow” points to the future.' },
      { id: 'was', label: 'Was', feedback: '“Was” is past tense and does not fit with “we visit”. Use “will” for the future.' },
      { id: 'will', label: 'Will', feedback: 'You got it! “Will visit” describes a future action.' },
    ],
  },
]
