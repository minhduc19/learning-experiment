export const story = {
  createdAt: "2026-11-10T21:26:42Z",
  "id": "birthday-surprise-v1",
  "title": "生日的惊喜",
  "pinyin": "Shēngrì de jīngxǐ",
  "translation": "A birthday surprise",
  "characters": {
    "lin": {
      "name": "小林 · Lin",
      "avatar": "林"
    },
    "zhou": {
      "name": "小明 · Ming",
      "avatar": "明"
    }
  },
  "steps": [
    {
      "id": "passage-0",
      "type": "read",
      "lines": [
        {
          "id": "line-0",
          "speaker": "lin",
          "words": [
            {
              "text": "今天是妈妈的生日。我想给她做一碗面。",
              "pinyin": "Jīntiān shì māma de shēngrì. Wǒ xiǎng gěi tā zuò yì wǎn miàn.",
              "meaning": "It is Mum’s birthday, and Lin wants to make her a bowl of noodles."
            }
          ]
        }
      ]
    },
    {
      "id": "quiz-0",
      "target-phrase": "一碗面",
      "type": "choice",
      "label": "Follow the story",
      "prompt": "What does Lin want to make?",
      "options": [
        {
          "id": "0",
          "words": [
            {
              "text": "一个蛋糕",
              "pinyin": "yí ge dàngāo"
            }
          ]
        },
        {
          "id": "1",
          "words": [
            {
              "text": "一碗面",
              "pinyin": "yì wǎn miàn"
            }
          ]
        },
        {
          "id": "2",
          "words": [
            {
              "text": "一杯茶",
              "pinyin": "yì bēi chá"
            }
          ]
        }
      ],
      "answer": [
        "1"
      ],
      "hint": "Read the preceding dialogue again and look for the key detail.",
      "explanation": "It is Mum’s birthday, and Lin wants to make her a bowl of noodles."
    },
    {
      "id": "passage-1",
      "type": "read",
      "lines": [
        {
          "id": "line-1",
          "speaker": "zhou",
          "words": [
            {
              "text": "冰箱里有鸡蛋和青菜。我来帮你洗菜吧！",
              "pinyin": "Bīngxiāng lǐ yǒu jīdàn hé qīngcài. Wǒ lái bāng nǐ xǐ cài ba!",
              "meaning": "Ming finds eggs and vegetables in the fridge and offers to wash the vegetables."
            }
          ]
        }
      ]
    },
    {
      "id": "quiz-1",
      "target-phrase": "洗菜",
      "type": "choice",
      "label": "Follow the story",
      "prompt": "How will Ming help?",
      "options": [
        {
          "id": "0",
          "words": [
            {
              "text": "洗菜",
              "pinyin": "xǐ cài"
            }
          ]
        },
        {
          "id": "1",
          "words": [
            {
              "text": "买花",
              "pinyin": "mǎi huā"
            }
          ]
        },
        {
          "id": "2",
          "words": [
            {
              "text": "打电话",
              "pinyin": "dǎ diànhuà"
            }
          ]
        }
      ],
      "answer": [
        "0"
      ],
      "hint": "Read the preceding dialogue again and look for the key detail.",
      "explanation": "Ming finds eggs and vegetables in the fridge and offers to wash the vegetables."
    },
    {
      "id": "passage-2",
      "type": "read",
      "lines": [
        {
          "id": "line-2",
          "speaker": "lin",
          "words": [
            {
              "text": "面做好了！妈妈回来了，我们一起说生日快乐吧！",
              "pinyin": "Miàn zuò hǎo le! Māma huí lái le, wǒmen yìqǐ shuō shēngrì kuàilè ba!",
              "meaning": "The noodles are ready, Mum is home, and the children wish her a happy birthday."
            }
          ]
        }
      ]
    },
    {
      "id": "quiz-2",
      "target-phrase": "生日快乐",
      "type": "prediction",
      "label": "Follow the story",
      "prompt": "What should they say to Mum?",
      "options": [
        {
          "id": "0",
          "words": [
            {
              "text": "明天见",
              "pinyin": "míngtiān jiàn"
            }
          ]
        },
        {
          "id": "1",
          "words": [
            {
              "text": "生日快乐",
              "pinyin": "shēngrì kuàilè"
            }
          ]
        },
        {
          "id": "2",
          "words": [
            {
              "text": "对不起",
              "pinyin": "duìbuqǐ"
            }
          ]
        }
      ],
      "answer": [
        "1"
      ],
      "hint": "Read the preceding dialogue again and look for the key detail.",
      "explanation": "The noodles are ready, Mum is home, and the children wish her a happy birthday."
    },
    {
      "id": "sequence",
      "target-phrase": "一起说生日快乐",
      "type": "order",
      "label": "The whole story",
      "prompt": "Put the events in story order.",
      "options": [
        {
          "id": "2",
          "words": [
            {
              "text": "面做好了！妈妈回来了，我们一起说生日快乐吧！",
              "pinyin": "Miàn zuò hǎo le! Māma huí lái le, wǒmen yìqǐ shuō shēngrì kuàilè ba!"
            }
          ]
        },
        {
          "id": "0",
          "words": [
            {
              "text": "今天是妈妈的生日。我想给她做一碗面。",
              "pinyin": "Jīntiān shì māma de shēngrì. Wǒ xiǎng gěi tā zuò yì wǎn miàn."
            }
          ]
        },
        {
          "id": "1",
          "words": [
            {
              "text": "冰箱里有鸡蛋和青菜。我来帮你洗菜吧！",
              "pinyin": "Bīngxiāng lǐ yǒu jīdàn hé qīngcài. Wǒ lái bāng nǐ xǐ cài ba!"
            }
          ]
        }
      ],
      "answer": [
        "0",
        "1",
        "2"
      ],
      "hint": "Start with the opening situation, then the discovery, then the response.",
      "explanation": "You followed the events from the opening to the ending."
    }
  ]
}
