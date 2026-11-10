export const story = {
  "id": "lost-umbrella-v1",
  "title": "谁的雨伞？",
  "pinyin": "Shéi de yǔsǎn?",
  "translation": "Whose umbrella is it?",
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
              "text": "下雨了！我的蓝色雨伞不见了。",
              "pinyin": "Xià yǔ le! Wǒ de lán sè yǔsǎn bú jiàn le.",
              "meaning": "It is raining, and Lin cannot find her blue umbrella."
            }
          ]
        }
      ]
    },
    {
      "id": "quiz-0",
      "type": "choice",
      "label": "Follow the story",
      "prompt": "What is Lin looking for?",
      "options": [
        {
          "id": "0",
          "words": [
            {
              "text": "蓝色雨伞",
              "pinyin": "lán sè yǔsǎn"
            }
          ]
        },
        {
          "id": "1",
          "words": [
            {
              "text": "红色书包",
              "pinyin": "hóng sè shūbāo"
            }
          ]
        },
        {
          "id": "2",
          "words": [
            {
              "text": "一本书",
              "pinyin": "yì běn shū"
            }
          ]
        }
      ],
      "answer": [
        "0"
      ],
      "hint": "Read the preceding dialogue again and look for the key detail.",
      "explanation": "It is raining, and Lin cannot find her blue umbrella."
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
              "text": "看！门后有一把蓝色雨伞，上面写着你的名字。",
              "pinyin": "Kàn! Mén hòu yǒu yì bǎ lán sè yǔsǎn, shàngmiàn xiězhe nǐ de míngzi.",
              "meaning": "Ming finds a blue umbrella behind the door, with Lin’s name on it."
            }
          ]
        }
      ]
    },
    {
      "id": "quiz-1",
      "type": "choice",
      "label": "Follow the story",
      "prompt": "Where does Ming find the umbrella?",
      "options": [
        {
          "id": "0",
          "words": [
            {
              "text": "桌子下面",
              "pinyin": "zhuōzi xiàmiàn"
            }
          ]
        },
        {
          "id": "1",
          "words": [
            {
              "text": "门后",
              "pinyin": "mén hòu"
            }
          ]
        },
        {
          "id": "2",
          "words": [
            {
              "text": "学校外面",
              "pinyin": "xuéxiào wàimiàn"
            }
          ]
        }
      ],
      "answer": [
        "1"
      ],
      "hint": "Read the preceding dialogue again and look for the key detail.",
      "explanation": "Ming finds a blue umbrella behind the door, with Lin’s name on it."
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
              "text": "太好了，谢谢你！你没有伞，我们一起走吧。",
              "pinyin": "Tài hǎo le, xièxie nǐ! Nǐ méiyǒu sǎn, wǒmen yìqǐ zǒu ba.",
              "meaning": "Lin thanks Ming and invites him to share her umbrella on the way home."
            }
          ]
        }
      ]
    },
    {
      "id": "quiz-2",
      "type": "prediction",
      "label": "Follow the story",
      "prompt": "What will the friends probably do next?",
      "options": [
        {
          "id": "0",
          "words": [
            {
              "text": "一起回家",
              "pinyin": "yìqǐ huí jiā"
            }
          ]
        },
        {
          "id": "1",
          "words": [
            {
              "text": "买三把伞",
              "pinyin": "mǎi sān bǎ sǎn"
            }
          ]
        },
        {
          "id": "2",
          "words": [
            {
              "text": "去游泳",
              "pinyin": "qù yóuyǒng"
            }
          ]
        }
      ],
      "answer": [
        "0"
      ],
      "hint": "Read the preceding dialogue again and look for the key detail.",
      "explanation": "Lin thanks Ming and invites him to share her umbrella on the way home."
    },
    {
      "id": "sequence",
      "type": "order",
      "label": "The whole story",
      "prompt": "Put the events in story order.",
      "options": [
        {
          "id": "2",
          "words": [
            {
              "text": "太好了，谢谢你！你没有伞，我们一起走吧。",
              "pinyin": "Tài hǎo le, xièxie nǐ! Nǐ méiyǒu sǎn, wǒmen yìqǐ zǒu ba."
            }
          ]
        },
        {
          "id": "0",
          "words": [
            {
              "text": "下雨了！我的蓝色雨伞不见了。",
              "pinyin": "Xià yǔ le! Wǒ de lán sè yǔsǎn bú jiàn le."
            }
          ]
        },
        {
          "id": "1",
          "words": [
            {
              "text": "看！门后有一把蓝色雨伞，上面写着你的名字。",
              "pinyin": "Kàn! Mén hòu yǒu yì bǎ lán sè yǔsǎn, shàngmiàn xiězhe nǐ de míngzi."
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
