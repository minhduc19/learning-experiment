export const questions = [
  {
    id: 'languages',
    instruction: 'Fill in the blank',
    sentence: 'I ___ three languages.',
    answer: 'speak',
    translation: 'Hablo tres idiomas.',
    options: [
      { id: 'speak', label: 'Speak', feedback: 'Exactly! We use “speak” to say which languages someone knows.' },
      { id: 'walk', label: 'Walk', feedback: '“Walk” means to move on foot. Which verb do we use with languages?' },
      { id: 'talk', label: 'Talk', feedback: '“Talk” describes having a conversation. Use “speak” when naming languages.' },
    ],
  },
  {
    id: 'breakfast',
    instruction: 'Fill in the blank',
    sentence: 'She ___ breakfast every morning.',
    answer: 'eats',
    translation: 'Ella desayuna todas las mañanas.',
    options: [
      { id: 'eat', label: 'Eat', feedback: 'You have the right verb! With “she”, add -s in the present simple.' },
      { id: 'eats', label: 'Eats', feedback: 'Great work! “She” takes “eats” in the present simple for a daily habit.' },
      { id: 'eating', label: 'Eating', feedback: '“Eating” needs a helping verb, as in “she is eating”. Here, describe a daily habit with the present simple.' },
    ],
  },
  {
    id: 'yesterday',
    instruction: 'Fill in the blank',
    sentence: 'We ___ to the park yesterday.',
    answer: 'went',
    translation: 'Fuimos al parque ayer.',
    options: [
      { id: 'go', label: 'Go', feedback: '“Go” is present tense. “Yesterday” tells us this happened in the past.' },
      { id: 'gone', label: 'Gone', feedback: '“Gone” is used with a helping verb like “have”. This sentence needs the simple past.' },
      { id: 'went', label: 'Went', feedback: 'You got it! “Went” is the simple past of “go”, so it fits with “yesterday”.' },
    ],
  },
]
