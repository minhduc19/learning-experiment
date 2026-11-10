// Explicit word segments keep pronunciation and contextual meaning aligned.
const words = s => s.split(' / ').map(w => { const [text, pinyin, meaning] = w.split('|'); return { text, pinyin, meaning } })
const line = (id, text, speaker = null) => ({ id, words: words(text), speaker })
const option = (id, text) => ({ id, words: words(text) })
export const story = {
  id: 'rainy-teahouse-v1', title: '雨天的小茶馆', pinyin: 'Yǔtiān de xiǎo cháguǎn', translation: 'The little teahouse in the rain',
  characters: { lin: { name: '小林 · Lin', avatar: '林', color: '#6c9a87' }, zhou: { name: '周先生 · Mr Zhou', avatar: '周', color: '#ba8f65' } },
  steps: [
    { id: 'opening', type: 'read', lines: [
      line('rain', '下午|xiàwǔ|afternoon / ， / 外面|wàimiàn|outside / 下雨了|xià yǔ le|it started raining / 。 / 小林|Xiǎo Lín|Lin / 在|zài|at / 茶馆|cháguǎn|teahouse / 工作|gōngzuò|work / 。'),
      line('guest', '一位|yí wèi|one / 老先生|lǎo xiānsheng|elderly gentleman / 走进来|zǒu jìnlái|walks in / ， / 衣服|yīfu|clothes / 都|dōu|all / 湿了|shī le|became wet / 。'),
      line('tea', '你好|nǐ hǎo|hello / ， / 我|wǒ|I / 想|xiǎng|would like / 喝|hē|drink / 一杯|yì bēi|one cup of / 热茶|rè chá|hot tea / 。', 'zhou'),
    ] },
    { id: 'understand', type: 'choice', label: 'Follow the story', prompt: 'Why does the man enter the teahouse?',
      options: [option('buy', '他|tā / 想|xiǎng / 买|mǎi / 一把|yì bǎ / 伞|sǎn'), option('tea', '他|tā / 想|xiǎng / 喝|hē / 热茶|rè chá'), option('work', '他|tā / 在|zài / 这里|zhèlǐ / 工作|gōngzuò')], answer: ['tea'], hint: 'Look at what the man asks for in his first line.', explanation: 'He comes in from the rain and asks for a cup of hot tea.' },
    { id: 'wallet', type: 'read', lines: [
      line('forgot', '可是|kěshì|but / …… / 我|wǒ|I / 忘了|wàng le|forgot / 带|dài|bring / 钱包|qiánbāo|wallet / 。', 'zhou'),
      line('gift', '没关系|méi guānxi|that’s okay / ， / 这杯|zhè bēi|this cup of / 茶|chá|tea / 我|wǒ|I / 请你|qǐng nǐ|will treat you to / ！', 'lin'),
      line('talk', '两个人|liǎng ge rén|the two people / 开始|kāishǐ|begin / 聊天|liáotiān|chatting / 。 / 周先生|Zhōu xiānsheng|Mr Zhou / 喜欢|xǐhuan|likes / 画画|huàhuà|drawing / 。'),
    ] },
    { id: 'word', type: 'word', label: 'A word in context', prompt: 'Tap the word that means “to chat”.',
      options: [option('start', '开始|kāishǐ'), option('chat', '聊天|liáotiān'), option('like', '喜欢|xǐhuan'), option('draw', '画画|huàhuà')], answer: ['chat'], hint: 'Find what the two people begin doing together.', explanation: '聊天 (liáotiān) means to chat or have a conversation.' },
    { id: 'drawing', type: 'read', lines: [
      line('cat', '周先生|Zhōu xiānsheng|Mr Zhou / 画了|huà le|drew / 一只|yì zhī|one / 猫|māo|cat / ， / 送给|sòng gěi|gave as a gift to / 小林|Xiǎo Lín|Lin / 。'),
      line('friend', '我们|wǒmen|we / 现在|xiànzài|now / 是|shì|are / 朋友|péngyou|friends / 了|le|now / ！ / 我|wǒ|I / 要|yào|will / 告诉|gàosu|tell / 大家|dàjiā|everyone / ， / 这里|zhèlǐ|here / 的|de|possessive / 茶|chá|tea / 很好喝|hěn hǎohē|is delicious / 。', 'zhou'),
    ] },
    { id: 'blanks', type: 'blanks', label: 'Complete the thought', prompt: 'Rebuild Mr Zhou’s promise.',
      before: words('我们|wǒmen / 现在|xiànzài / 是|shì'), between: words('了|le / ！ / 我|wǒ / 要|yào'), after: words('大家|dàjiā / 。'),
      options: [option('tell', '告诉|gàosu'), option('umbrella', '雨伞|yǔsǎn'), option('friend', '朋友|péngyou'), option('window', '窗户|chuānghu')], answer: ['friend', 'tell'], hint: 'First comes their new relationship, then the action meaning “tell”.', explanation: '“We are friends now! I will tell everyone.”' },
    { id: 'return', type: 'read', lines: [
      line('next', '第二天|dì èr tiān|the next day / ， / 周先生|Zhōu xiānsheng|Mr Zhou / 带着|dàizhe|brought along / 三个|sān ge|three / 朋友|péngyou|friends / 来了|lái le|came / 。'),
      line('order', '我们|wǒmen|we / 要|yào|would like / 四杯|sì bēi|four cups of / 茶|chá|tea / ！', 'zhou'),
    ] },
    { id: 'predict', type: 'prediction', label: 'What comes next?', prompt: 'Which reply makes sense for Lin?',
      options: [option('closed', '茶馆|cháguǎn / 昨天|zuótiān / 没有|méiyǒu / 开门|kāimén'), option('welcome', '欢迎|huānyíng / ！ / 请坐|qǐng zuò / ， / 茶|chá / 马上|mǎshàng / 就来|jiù lái'), option('lost', '我|wǒ / 找不到|zhǎo bú dào / 学校|xuéxiào')], answer: ['welcome'], hint: 'Four guests have just ordered tea. How would a host respond?', explanation: 'Lin welcomes the guests and says their tea will be ready soon.' },
    { id: 'ending', type: 'read', lines: [
      line('welcome', '欢迎|huānyíng|welcome / ！ / 请坐|qǐng zuò|please sit / ， / 茶|chá|tea / 马上|mǎshàng|right away / 就来|jiù lái|will come / 。', 'lin'),
      line('wall', '小林|Xiǎo Lín|Lin / 把|bǎ|object marker / 猫|māo|cat / 的|de|possessive / 画|huà|drawing / 挂在|guà zài|hung on / 墙上|qiáng shàng|the wall / 。'),
      line('happy', '一杯|yì bēi|one cup of / 茶|chá|tea / ， / 换来了|huàn lái le|brought in return / 一张|yì zhāng|one / 画|huà|drawing / ， / 还有|hái yǒu|and also / 新|xīn|new / 朋友|péngyou|friends / 。'),
    ] },
    { id: 'sequence', type: 'order', label: 'The whole story', prompt: 'Put these moments in story order.',
      options: [option('return', '周先生|Zhōu xiānsheng / 带|dài / 朋友|péngyou / 来|lái'), option('gift', '周先生|Zhōu xiānsheng / 送给|sòng gěi / 小林|Xiǎo Lín / 一张|yì zhāng / 画|huà'), option('tea', '小林|Xiǎo Lín / 请|qǐng / 周先生|Zhōu xiānsheng / 喝茶|hē chá')], answer: ['tea', 'gift', 'return'], hint: 'Start with Lin’s kindness. The visit with friends happens the next day.', explanation: 'First the tea, then the drawing, then a visit with new friends.' },
  ],
}
