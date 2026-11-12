// An original elementary retelling of the familiar Chinese tale 小马过河.
// Each dialogue turn or paragraph contains independently annotated words and phrases.
const words = value => value.split(' / ').map(segment => {
  const [text, pinyin, meaning] = segment.split('|')
  return { text, pinyin, meaning }
})
const line = (id, speaker, value) => ({ id, speaker, words: words(value) })
const option = (id, value) => ({ id, words: words(value) })

export const story = {
  createdAt: "2026-11-11T17:27:02Z",
  id: "little-horse-river-v1",
  title: "小马过河",
  pinyin: "Xiǎo mǎ guò hé",
  translation: "The little horse crosses the river",
  tagline: "A FAMILIAR CHINESE TALE · LISTEN, THINK, AND LOOK",
  characters: {
    "horse": {
      "name": "小马 · Little Horse",
      "avatar": "马"
    },
    "mother": {
      "name": "妈妈 · Mother Horse",
      "avatar": "妈"
    },
    "ox": {
      "name": "牛伯伯 · Uncle Ox",
      "avatar": "牛"
    },
    "squirrel": {
      "name": "小松鼠 · Little Squirrel",
      "avatar": "松"
    },
    "uncle": {
      "name": "马叔叔 · Uncle Horse",
      "avatar": "叔"
    }
  },
  steps: [
    {
      id: "help-at-home",
      type: "read",
      title: "第一幕 · 我也想帮忙",
      lines: [
        line("morning", null, `早上|zǎo shang|morning / ， / 小马|xiǎo mǎ|little horse / 看见|kàn jiàn|to see / 妈妈|mā ma|Mum; mother / 在|zài|at; in; doing / 家里|jiā lǐ|at home / 忙来忙去|máng lái máng qù|to bustle about / 。 / 他|tā|he; him / 走到|zǒu dào|to walk to / 妈妈|mā ma|Mum; mother / 身边|shēn biān|by one's side / ， / 看看|kàn kan|to take a look / 桌上|zhuō shang|on the table / 的|de|linking particle; of / 小袋子|xiǎo dài zi|small bag / ， / 又|yòu|and then; also / 看看|kàn kan|to take a look / 门外|mén wài|outside the door / 的|de|linking particle; of / 路|lù|road; path / 。 / 今天|jīn tiān|today / 的|de|linking particle; of / 天气|tiān qì|weather / 很|hěn|very / 好|hǎo|good; fine / ， / 他|tā|he; him / 也|yě|also; too / 想|xiǎng|to want; to think / 出门|chū mén|to go out / ， / 帮|bāng|to help / 妈妈|mā ma|Mum; mother / 做|zuò|to do; to make / 一点|yì diǎn|a little / 事|shì|matter; thing / 。`),
        line("offer", "horse", `妈妈|mā ma|Mum; mother / ， / 你|nǐ|you / 在|zài|at; in; doing / 忙|máng|busy; to be busy with / 什么|shén me|what; any / ？ / 我|wǒ|I; me / 已经|yǐ jīng|already / 长大|zhǎng dà|to grow up / 了|le|change-of-state or completed-action particle / ， / 也|yě|also; too / 想|xiǎng|to want; to think / 帮忙|bāng máng|to help / 。 / 你|nǐ|you / 每天|měi tiān|every day / 为|wèi|for; on behalf of / 我|wǒ|I; me / 做|zuò|to do; to make / 很多|hěn duō|many; a lot / 事|shì|matter; thing / ， / 今天|jīn tiān|today / 让|ràng|to let; to allow / 我|wǒ|I; me / 为|wèi|for; on behalf of / 你|nǐ|you / 做|zuò|to do; to make / 一件事|yí jiàn shì|one task; one thing / ， / 好不好|hǎo bu hǎo|is that all right? / ？ / 小袋子|xiǎo dài zi|small bag / 里|lǐ|inside / 是|shì|is; to be / 什么|shén me|what; any / ？ / 我|wǒ|I; me / 可以|kě yǐ|can; may / 把|bǎ|marks the object being acted on / 它|tā|it / 送到|sòng dào|to deliver to / 哪里|nǎ lǐ|where / 去|qù|to go / ？`),
        line("task", "mother", `这里面|zhè lǐ mian|inside here / 是|shì|is; to be / 面粉|miàn fěn|flour / 。 / 你|nǐ|you / 把|bǎ|marks the object being acted on / 它|tā|it / 送到|sòng dào|to deliver to / 河|hé|river / 那边|nà bian|the other side; over there / 的|de|linking particle; of / 马叔叔|mǎ shū shu|Uncle Horse / 家|jiā|home / 吧|ba|suggestion particle / 。 / 他|tā|he; him / 今天|jīn tiān|today / 要|yào|need to; should / 做|zuò|to do; to make / 面条|miàn tiáo|noodles / 。 / 袋子|dài zi|bag / 不重|bú zhòng|not heavy / ， / 你|nǐ|you / 可以|kě yǐ|can; may / 背着|bēi zhe|carrying on one's back / 走|zǒu|to walk / 。 / 不过|bú guò|however / ， / 路上|lù shang|on the road / 有|yǒu|to have / 一条|yì tiáo|one (river or road) / 小河|xiǎo hé|small river / 。 / 到了|dào le|reached; arrived at / 河边|hé biān|riverside; riverbank / ， / 先|xiān|first / 看看|kàn kan|to take a look / ， / 再|zài|then; again / 想想|xiǎng xiang|to think it over / ， / 不要|bú yào|do not / 着急|zháo jí|anxious; in a hurry / 。`),
      ],
    },
    {
      id: "understand-task",
      type: "choice",
      label: "A reason for the journey",
      "target-phrase": "帮妈妈做事",
      prompt: "Why is Little Horse setting out?",
      options: [
        option("help", `他|tā|he; him / 想|xiǎng|to want; to think / 帮|bāng|to help / 妈妈|mā ma|Mum; mother / 送|sòng|to deliver; to take to / 面粉|miàn fěn|flour / 。`),
        option("play", `他|tā|he; him / 只|zhǐ|only / 想|xiǎng|to want; to think / 去|qù|to go / 河|hé|river / 里|lǐ|inside / 玩|wán|to play / 。`),
        option("buy", `他|tā|he; him / 要|yào|need to; should / 去|qù|to go / 买|mǎi|to buy / 一个|yí ge|one; a / 袋子|dài zi|bag / 。`),
      ],
      answer: ["help"],
      hint: "He asks to do something for his mother. What is inside the bag?",
      explanation: "He wants to help by delivering flour. The river is a problem on the way to that goal, not a place he set out to play.",
    },
    {
      id: "at-the-river",
      type: "read",
      title: "第二幕 · 河有多深？",
      lines: [
        line("road", null, `小马|xiǎo mǎ|little horse / 背着|bēi zhe|carrying on one's back / 面粉|miàn fěn|flour / ， / 沿着|yán zhe|along / 小路|xiǎo lù|small path / 往前走|wǎng qián zǒu|to walk forward / 。 / 他|tā|he; him / 一边|yì biān|while (doing something) / 走|zǒu|to walk / ， / 一边|yì biān|while (doing something) / 轻轻地|qīng qīng de|softly; gently / 说|shuō|to say; to speak / ： / “ / 先|xiān|first / 看看|kàn kan|to take a look / ， / 再|zài|then; again / 想想|xiǎng xiang|to think it over / ， / 不要|bú yào|do not / 着急|zháo jí|anxious; in a hurry / 。 / ” / 不久|bù jiǔ|soon; before long / ， / 他|tā|he; him / 听见了|tīng jiàn le|heard / 水声|shuǐ shēng|sound of water / 。 / 小路|xiǎo lù|small path / 前面|qián mian|ahead; in front / 有|yǒu|to have / 一条|yì tiáo|one (river or road) / 河|hé|river / ， / 水|shuǐ|water / 慢慢地|màn màn de|slowly / 流着|liú zhe|flowing / ， / 河上|hé shang|over the river / 没有|méi yǒu|did not; have not / 桥|qiáo|bridge / 。`),
        line("question", "horse", `这|zhè|this / 就是|jiù shì|is exactly; is the one / 妈妈|mā ma|Mum; mother / 说|shuō|to say; to speak / 的|de|linking particle; of / 小河|xiǎo hé|small river / 吧|ba|suggestion particle / ？ / 河|hé|river / 那边|nà bian|the other side; over there / 有|yǒu|to have / 一棵|yì kē|one (tree) / 大树|dà shù|big tree / ， / 树后面|shù hòu mian|behind the tree / 应该|yīng gāi|should; probably / 就是|jiù shì|is exactly; is the one / 马叔叔|mǎ shū shu|Uncle Horse / 的|de|linking particle; of / 家|jiā|home / 。 / 可是|kě shì|but; however / ， / 这条|zhè tiáo|this (river or road) / 河|hé|river / 有|yǒu|to have / 多深|duō shēn|how deep / 呢|ne|question particle / ？ / 我|wǒ|I; me / 没有|méi yǒu|did not; have not / 过过河|guò guo hé|have crossed a river before / ， / 不|bù|not / 知道|zhī dào|to know / 自己|zì jǐ|oneself / 能不能|néng bu néng|whether one can / 过去|guò qu|to go across / 。 / 我|wǒ|I; me / 要|yào|need to; should / 先|xiān|first / 问一问|wèn yi wèn|to ask / 。`),
        line("ask-ox", "horse", `牛伯伯|niú bó bo|Uncle Ox / ， / 您好|nín hǎo|hello (respectful) / ！ / 您|nín|you (respectful) / 刚|gāng|just; just now / 从|cóng|from / 河|hé|river / 那边|nà bian|the other side; over there / 过来|guò lai|to come across; to come over / 吗|ma|yes-or-no question particle / ？ / 我|wǒ|I; me / 想|xiǎng|to want; to think / 把|bǎ|marks the object being acted on / 面粉|miàn fěn|flour / 送到|sòng dào|to deliver to / 河|hé|river / 那边|nà bian|the other side; over there / 去|qù|to go / ， / 可是|kě shì|but; however / 我|wǒ|I; me / 不|bù|not / 知道|zhī dào|to know / 水|shuǐ|water / 有|yǒu|to have / 多深|duō shēn|how deep / 。 / 您|nín|you (respectful) / 能|néng|can; to be able to / 告诉|gào su|to tell / 我|wǒ|I; me / ， / 您|nín|you (respectful) / 从|cóng|from / 哪里|nǎ lǐ|where / 走过来|zǒu guò lai|to walk across toward here / ， / 水|shuǐ|water / 到|dào|to reach; up to / 您|nín|you (respectful) / 身上|shēn shang|on one's body / 哪里|nǎ lǐ|where / 吗|ma|yes-or-no question particle / ？`),
      ],
    },
    {
      id: "ox-advice",
      type: "read",
      title: "第三幕 · 牛伯伯说很浅",
      lines: [
        line("ox-answer", "ox", `孩子|hái zi|child / ， / 我|wǒ|I; me / 刚|gāng|just; just now / 从|cóng|from / 那边|nà bian|the other side; over there / 走过来|zǒu guò lai|to walk across toward here / 。 / 我|wǒ|I; me / 走|zǒu|to walk / 的|de|linking particle; of / 是|shì|is; to be / 大树前面|dà shù qián mian|in front of the big tree / 的|de|linking particle; of / 那条|nà tiáo|that (path or river) / 路|lù|road; path / 。 / 那里|nà lǐ|there / 的|de|linking particle; of / 水|shuǐ|water / 不深|bù shēn|not deep / ， / 只|zhǐ|only / 到|dào|to reach; up to / 我|wǒ|I; me / 的|de|linking particle; of / 小腿|xiǎo tuǐ|lower leg; shin / 。 / 你|nǐ|you / 看|kàn|to look / ， / 我|wǒ|I; me / 的|de|linking particle; of / 腿上|tuǐ shang|on the legs / 还|hái|still; also / 有|yǒu|to have / 水|shuǐ|water / 呢|ne|question particle / 。 / 对我来说|duì wǒ lái shuō|for me; from my point of view / ， / 这条|zhè tiáo|this (river or road) / 河|hé|river / 很浅|hěn qiǎn|very shallow / ， / 走过来|zǒu guò lai|to walk across toward here / 并不难|bìng bù nán|is not difficult at all / 。`),
        line("horse-relief", "horse", `原来|yuán lái|so it turns out / 很浅|hěn qiǎn|very shallow / 啊|a|exclamation particle / ！ / 谢谢|xiè xie|thank you / 您|nín|you (respectful) / ， / 牛伯伯|niú bó bo|Uncle Ox / 。 / 您|nín|you (respectful) / 的|de|linking particle; of / 腿|tuǐ|leg / 又高又长|yòu gāo yòu cháng|both tall and long / ， / 走得|zǒu de|walks (followed by a description) / 也|yě|also; too / 很|hěn|very / 稳|wěn|steady; steadily / 。 / 我|wǒ|I; me / 的|de|linking particle; of / 腿|tuǐ|leg / 没有|méi yǒu|did not; have not / 您|nín|you (respectful) / 的|de|linking particle; of / 长|cháng|long / ， / 可是|kě shì|but; however / 我|wǒ|I; me / 也|yě|also; too / 不算|bú suàn|not count as; not particularly / 小|xiǎo|small; young / 。 / 让|ràng|to let; to allow / 我|wǒ|I; me / 先|xiān|first / 走到|zǒu dào|to walk to / 水边|shuǐ biān|the water's edge / 看看|kàn kan|to take a look / ， / 再|zài|then; again / 想想|xiǎng xiang|to think it over / 该|gāi|should / 怎么走|zěn me zǒu|how to go; which way to walk / 。`),
        line("bank", null, `小马|xiǎo mǎ|little horse / 来到|lái dào|to arrive at / 水边|shuǐ biān|the water's edge / ， / 把|bǎ|marks the object being acted on / 一只脚|yì zhī jiǎo|one foot / 放在|fàng zài|to put on; to place at / 岸边|àn biān|the riverbank / 的|de|linking particle; of / 石头上|shí tou shang|on a stone / 。 / 他|tā|he; him / 没有|méi yǒu|did not; have not / 马上|mǎ shàng|immediately / 往|wǎng|toward / 水里|shuǐ lǐ|in the water / 走|zǒu|to walk / ， / 而是|ér shì|but rather / 低头|dī tóu|to lower one's head / 看了看|kàn le kan|took a look / 。 / 水里|shuǐ lǐ|in the water / 有|yǒu|to have / 小石头|xiǎo shí tou|small stones / ， / 也|yě|also; too / 有|yǒu|to have / 他|tā|he; him / 看不清|kàn bu qīng|cannot see clearly / 的|de|linking particle; of / 地方|dì fang|place / 。 / 这时|zhè shí|at this moment / ， / 树上|shù shang|in the tree / 传来|chuán lái|to come from a distance (sound or news) / 一个|yí ge|one; a / 着急|zháo jí|anxious; in a hurry / 的|de|linking particle; of / 声音|shēng yīn|voice; sound / 。`),
      ],
    },
    {
      id: "shallow-word",
      type: "word",
      label: "A word with a viewpoint",
      "target-phrase": "浅",
      prompt: "Which word means “shallow”, as the ox describes the water?",
      options: [
        option("deep", `深|shēn|deep`),
        option("shallow", `浅|qiǎn|shallow`),
        option("fast", `快|kuài|fast`),
        option("heavy", `重|zhòng|heavy`),
      ],
      answer: ["shallow"],
      hint: "The water reaches only the lower part of the ox’s legs.",
      explanation: "浅 means shallow. Notice that the ox says “对我来说”: the water is shallow for his body, along the route he took.",
    },
    {
      id: "squirrel-warning",
      type: "read",
      title: "第四幕 · 小松鼠说很深",
      lines: [
        line("stop", "squirrel", `小马|xiǎo mǎ|little horse / ， / 等一等|děng yi děng|wait a moment / ！ / 先|xiān|first / 别|bié|do not / 下水|xià shuǐ|to enter the water / ！ / 这条|zhè tiáo|this (river or road) / 河|hé|river / 对我来说|duì wǒ lái shuō|for me; from my point of view / 很深|hěn shēn|very deep / 。 / 我|wǒ|I; me / 上次|shàng cì|last time / 想|xiǎng|to want; to think / 去|qù|to go / 河|hé|river / 那边|nà bian|the other side; over there / 找|zhǎo|to look for; to seek / 朋友|péng you|friend / ， / 走到|zǒu dào|to walk to / 水边|shuǐ biān|the water's edge / ， / 水|shuǐ|water / 一下|yí xià|all at once; briefly / 就|jiù|then; in that case / 到了|dào le|reached; arrived at / 我|wǒ|I; me / 的|de|linking particle; of / 肚子|dù zi|belly / 。 / 我|wǒ|I; me / 很|hěn|very / 害怕|hài pà|afraid / ， / 就|jiù|then; in that case / 赶快|gǎn kuài|quickly; right away / 回来了|huí lai le|has come back / 。 / 你|nǐ|you / 一定|yí dìng|certainly; must / 要|yào|need to; should / 小心|xiǎo xīn|careful / ！`),
        line("two-answers", "horse", `谢谢|xiè xie|thank you / 你|nǐ|you / 叫住|jiào zhù|to call out to stop someone / 我|wǒ|I; me / 。 / 可是|kě shì|but; however / ， / 牛伯伯|niú bó bo|Uncle Ox / 刚才|gāng cái|just now / 说|shuō|to say; to speak / 水|shuǐ|water / 很浅|hěn qiǎn|very shallow / ， / 你|nǐ|you / 却|què|yet; but / 说|shuō|to say; to speak / 水|shuǐ|water / 很深|hěn shēn|very deep / 。 / 同一条|tóng yì tiáo|the same (river or path) / 河|hé|river / ， / 为什么|wèi shén me|why / 你们|nǐ men|you (plural) / 说|shuō|to say; to speak / 的|de|linking particle; of / 不一样|bù yí yàng|different / ？ / 我|wǒ|I; me / 到底|dào dǐ|actually; on earth (in a question) / 该|gāi|should / 听|tīng|to listen to; to follow / 谁的|shéi de|whose; whose advice / 呢|ne|question particle / ？ / 你们|nǐ men|you (plural) / 两个|liǎng ge|two / 是不是|shì bu shì|is it the case that / 有|yǒu|to have / 一个|yí ge|one; a / 说错了|shuō cuò le|said something wrong / ？`),
        line("small-body", "squirrel", `我|wǒ|I; me / 没有|méi yǒu|did not; have not / 骗|piàn|to deceive / 你|nǐ|you / ， / 牛伯伯|niú bó bo|Uncle Ox / 也|yě|also; too / 不一定|bù yí dìng|not necessarily / 说错了|shuō cuò le|said something wrong / 。 / 你|nǐ|you / 看|kàn|to look / ， / 我|wǒ|I; me / 的|de|linking particle; of / 身体|shēn tǐ|body / 这么|zhè me|so; this much / 小|xiǎo|small; young / ， / 牛伯伯|niú bó bo|Uncle Ox / 却|què|yet; but / 那么|nà me|so; that much / 高|gāo|tall; high / 。 / 到|dào|to reach; up to / 他|tā|he; him / 小腿|xiǎo tuǐ|lower leg; shin / 的|de|linking particle; of / 水|shuǐ|water / ， / 对我来说|duì wǒ lái shuō|for me; from my point of view / 已经|yǐ jīng|already / 很深|hěn shēn|very deep / 了|le|change-of-state or completed-action particle / 。 / 你|nǐ|you / 比|bǐ|compared with / 我|wǒ|I; me / 高|gāo|tall; high / ， / 可|kě|really; indeed (emphasis) / 你|nǐ|you / 也|yě|also; too / 要|yào|need to; should / 自己|zì jǐ|oneself / 想一想|xiǎng yi xiǎng|to think it over / 。`),
      ],
    },
    {
      id: "different-bodies",
      type: "choice",
      label: "Both voices matter",
      "target-phrase": "对我来说",
      prompt: "How can the ox and the squirrel give different answers without lying?",
      options: [
        option("lie", `小松鼠|xiǎo sōng shǔ|little squirrel / 一定|yí dìng|certainly; must / 在|zài|at; in; doing / 骗人|piàn rén|to lie; to deceive people / 。`),
        option("bodies", `他们|tā men|they; them / 的|de|linking particle; of / 身体|shēn tǐ|body / 大小|dà xiǎo|size; big or small / 不一样|bù yí yàng|different / 。`),
        option("same", `他们|tā men|they; them / 的|de|linking particle; of / 腿|tuǐ|leg / 一样|yí yàng|the same / 长|cháng|long / 。`),
      ],
      answer: ["bodies"],
      hint: "Compare where the water reaches on each animal’s body.",
      explanation: "Their bodies are different sizes. “Shallow for me” is not the same claim as “shallow for everyone”. Both experiences help Little Horse think.",
    },
    {
      id: "home-again",
      type: "read",
      title: "第五幕 · 回家问妈妈",
      lines: [
        line("return-home", null, `小马|xiǎo mǎ|little horse / 站在|zhàn zài|to stand at / 岸边|àn biān|the riverbank / 想|xiǎng|to want; to think / 了|le|change-of-state or completed-action particle / 很久|hěn jiǔ|a long time / ， / 还是|hái shi|still; remains / 不|bù|not / 知道|zhī dào|to know / 怎么办|zěn me bàn|what to do / 。 / 他|tā|he; him / 没有|méi yǒu|did not; have not / 一个人|yí ge rén|alone; by oneself / 下水|xià shuǐ|to enter the water / ， / 而是|ér shì|but rather / 背着|bēi zhe|carrying on one's back / 面粉|miàn fěn|flour / 回家|huí jiā|to go home / 。 / 妈妈|mā ma|Mum; mother / 看见|kàn jiàn|to see / 袋子|dài zi|bag / 还在|hái zài|is still there / ， / 先|xiān|first / 给|gěi|to; for / 他|tā|he; him / 一碗水|yì wǎn shuǐ|a bowl of water / ， / 让|ràng|to let; to allow / 他|tā|he; him / 坐下|zuò xià|to sit down / ， / 把|bǎ|marks the object being acted on / 路上|lù shang|on the road / 的|de|linking particle; of / 事|shì|matter; thing / 慢慢|màn màn|slowly; gradually / 说清楚|shuō qīng chu|to explain clearly / 。`),
        line("tell-mother", "horse", `妈妈|mā ma|Mum; mother / ， / 我|wǒ|I; me / 没有|méi yǒu|did not; have not / 把|bǎ|marks the object being acted on / 面粉|miàn fěn|flour / 送到|sòng dào|to deliver to / 。 / 牛伯伯|niú bó bo|Uncle Ox / 说|shuō|to say; to speak / 河|hé|river / 很浅|hěn qiǎn|very shallow / ， / 小松鼠|xiǎo sōng shǔ|little squirrel / 说|shuō|to say; to speak / 河|hé|river / 很深|hěn shēn|very deep / 。 / 我|wǒ|I; me / 听了|tīng le|heard; listened to / 这个|zhè ge|this one / ， / 又|yòu|and then; also / 听了|tīng le|heard; listened to / 那个|nà ge|that one / ， / 越听越|yuè tīng yuè|the more one listens, the more / 不|bù|not / 知道|zhī dào|to know / 怎么办|zěn me bàn|what to do / 。 / 我|wǒ|I; me / 是不是|shì bu shì|is it the case that / 太小|tài xiǎo|too small; too young / 了|le|change-of-state or completed-action particle / ， / 什么|shén me|what; any / 事|shì|matter; thing / 都|dōu|always; all / 做不好|zuò bu hǎo|cannot do well / ？`),
        line("mother-listens", "mother", `你|nǐ|you / 先|xiān|first / 问|wèn|to ask / 别人|bié ren|other people / ， / 也|yě|also; too / 没有|méi yǒu|did not; have not / 急着|jí zhe|to be in a hurry to / 下水|xià shuǐ|to enter the water / ， / 这|zhè|this / 很|hěn|very / 好|hǎo|good; fine / 。 / 听到|tīng dào|to hear / 两个|liǎng ge|two / 不一样|bù yí yàng|different / 的|de|linking particle; of / 回答|huí dá|answer; response / ， / 不一定|bù yí dìng|not necessarily / 是|shì|is; to be / 坏事|huài shì|a bad thing; misfortune / 。 / 你|nǐ|you / 可以|kě yǐ|can; may / 想想|xiǎng xiang|to think it over / ： / 他们|tā men|they; them / 有|yǒu|to have / 多高|duō gāo|how tall / ？ / 他们|tā men|they; them / 走|zǒu|to walk / 的|de|linking particle; of / 是不是|shì bu shì|is it the case that / 同一个|tóng yí ge|the same one / 地方|dì fang|place / ？ / 你|nǐ|you / 自己|zì jǐ|oneself / 又|yòu|and then; also / 有|yǒu|to have / 多高|duō gāo|how tall / 呢|ne|question particle / ？`),
      ],
    },
    {
      id: "compare-blanks",
      type: "blanks",
      label: "Build the useful comparison",
      "target-phrase": "不一样",
      prompt: "Complete Mother Horse’s reminder about what to compare.",
      before: words(`先|xiān|first / 看看|kàn kan|to take a look / 他们|tā men|they; them / 的|de|linking particle; of`),
      between: words(`， / 再|zài|then; again / 看看|kàn kan|to take a look / 自己|zì jǐ|oneself / 的|de|linking particle; of`),
      after: words(`。`),
      options: [
        option("body", `身体|shēn tǐ|body`),
        option("bag", `袋子|dài zi|bag`),
        option("height", `高矮|gāo ǎi|height; how tall or short`),
        option("noodles", `面条|miàn tiáo|noodles`),
      ],
      answer: ["body", "height"],
      hint: "The first blank names what they are comparing; the second means how tall or short Little Horse is.",
      explanation: "“First look at their bodies, then at your own height.” Advice becomes useful when he connects it to the situation he actually faces.",
    },
    {
      id: "make-a-plan",
      type: "read",
      title: "第六幕 · 一起去看看",
      lines: [
        line("ask-help", "horse", `妈妈|mā ma|Mum; mother / ， / 我|wǒ|I; me / 明白|míng bai|to understand / 一点|yì diǎn|a little / 了|le|change-of-state or completed-action particle / 。 / 牛伯伯|niú bó bo|Uncle Ox / 高|gāo|tall; high / ， / 小松鼠|xiǎo sōng shǔ|little squirrel / 小|xiǎo|small; young / ， / 我|wǒ|I; me / 和|hé|and; with / 他们|tā men|they; them / 都不一样|dōu bù yí yàng|are all different / 。 / 可是|kě shì|but; however / ， / 我|wǒ|I; me / 看不清|kàn bu qīng|cannot see clearly / 水下|shuǐ xià|under the water / 的|de|linking particle; of / 路|lù|road; path / ， / 也|yě|also; too / 不|bù|not / 知道|zhī dào|to know / 哪里|nǎ lǐ|where / 最安全|zuì ān quán|safest / 。 / 你|nǐ|you / 能|néng|can; to be able to / 陪|péi|to accompany / 我|wǒ|I; me / 再去|zài qù|to go again / 看看|kàn kan|to take a look / 吗|ma|yes-or-no question particle / ？ / 我|wǒ|I; me / 想|xiǎng|to want; to think / 学|xué|to learn / ， / 可是|kě shì|but; however / 不想|bù xiǎng|do not want to / 乱试|luàn shì|to try recklessly / 。`),
        line("plan", "mother", `当然|dāng rán|of course / 可以|kě yǐ|can; may / 。 / 自己|zì jǐ|oneself / 想办法|xiǎng bàn fǎ|to find a way / ， / 不是说|bú shì shuō|does not mean that / 什么|shén me|what; any / 都要|dōu yào|all have to / 一个人|yí ge rén|alone; by oneself / 做|zuò|to do; to make / 。 / 我们|wǒ men|we; us / 一起|yì qǐ|together / 去|qù|to go / ， / 先|xiān|first / 问清楚|wèn qīng chu|to ask and make sure / 路|lù|road; path / ， / 再|zài|then; again / 看看|kàn kan|to take a look / 水流|shuǐ liú|water current / 。 / 要是|yào shi|if / 水|shuǐ|water / 太深|tài shēn|too deep / ， / 或者|huò zhě|or / 走不稳|zǒu bu wěn|cannot walk steadily / ， / 就|jiù|then; in that case / 回来|huí lai|to come back / 。 / 今天|jīn tiān|today / 送不到|sòng bu dào|cannot deliver successfully / ， / 也|yě|also; too / 可以|kě yǐ|can; may / 晚一点|wǎn yì diǎn|a little later / 送|sòng|to deliver; to take to / 。`),
        line("back-to-bank", null, `妈妈|mā ma|Mum; mother / 和|hé|and; with / 小马|xiǎo mǎ|little horse / 一起|yì qǐ|together / 回到|huí dào|to return to / 河边|hé biān|riverside; riverbank / 。 / 牛伯伯|niú bó bo|Uncle Ox / 还在|hái zài|is still there / 大树|dà shù|big tree / 旁边|páng biān|beside; nearby / 吃草|chī cǎo|to graze; to eat grass / ， / 小松鼠|xiǎo sōng shǔ|little squirrel / 也|yě|also; too / 从|cóng|from / 树上|shù shang|in the tree / 下来|xià lai|to come down / 。 / 小马|xiǎo mǎ|little horse / 没有|méi yǒu|did not; have not / 马上|mǎ shàng|immediately / 下水|xià shuǐ|to enter the water / 。 / 他|tā|he; him / 先|xiān|first / 谢谢|xiè xie|thank you / 两位|liǎng wèi|two (people, respectful) / 朋友|péng you|friend / ， / 又|yòu|and then; also / 请|qǐng|to ask; to invite / 牛伯伯|niú bó bo|Uncle Ox / 把|bǎ|marks the object being acted on / 刚才|gāng cái|just now / 走过的|zǒu guo de|that one has walked along / 地方|dì fang|place / 指给|zhǐ gěi|to point out to / 他们|tā men|they; them / 看|kàn|to look / 。`),
      ],
    },
    {
      id: "safe-prediction",
      type: "prediction",
      label: "What should happen next?",
      "target-phrase": "先看看，再想想",
      prompt: "Which next action fits the plan they have just made?",
      options: [
        option("jump", `小马|xiǎo mǎ|little horse / 一个人|yí ge rén|alone; by oneself / 马上|mǎ shàng|immediately / 跳进|tiào jìn|to jump into / 河|hé|river / 里|lǐ|inside / 。`),
        option("check", `小马|xiǎo mǎ|little horse / 和|hé|and; with / 妈妈|mā ma|Mum; mother / 先|xiān|first / 看看|kàn kan|to take a look / 水|shuǐ|water / 和|hé|and; with / 路|lù|road; path / 。`),
        option("ignore", `小马|xiǎo mǎ|little horse / 闭上|bì shàng|to close / 眼睛|yǎn jing|eyes / ， / 什么也不看|shén me yě bú kàn|to look at nothing / 。`),
      ],
      answer: ["check"],
      hint: "The plan includes checking the route and having help, not proving bravery.",
      explanation: "He is learning to observe and think with support. Trying something for himself does not mean ignoring risk or refusing help.",
    },
    {
      id: "careful-crossing",
      type: "read",
      title: "第七幕 · 一步一步走",
      lines: [
        line("check-water", "mother", `你|nǐ|you / 看|kàn|to look / ， / 这边|zhè bian|this side; here / 的|de|linking particle; of / 水|shuǐ|water / 流得|liú de|flows (followed by a description) / 慢|màn|slow; slowly / ， / 水下|shuǐ xià|under the water / 的|de|linking particle; of / 路|lù|road; path / 也|yě|also; too / 比较|bǐ jiào|relatively; rather / 平|píng|flat; level / 。 / 我|wǒ|I; me / 的|de|linking particle; of / 脚|jiǎo|foot / 能|néng|can; to be able to / 站稳|zhàn wěn|to stand firmly / 。 / 你|nǐ|you / 先|xiān|first / 站在|zhàn zài|to stand at / 我|wǒ|I; me / 身边|shēn biān|by one's side / ， / 慢慢|màn màn|slowly; gradually / 放下|fàng xià|to put down; to lower / 一只脚|yì zhī jiǎo|one foot / ， / 看看|kàn kan|to take a look / 水|shuǐ|water / 到|dào|to reach; up to / 哪里|nǎ lǐ|where / 。 / 不要|bú yào|do not / 跑|pǎo|to run / ， / 也|yě|also; too / 不要|bú yào|do not / 跳|tiào|to jump / 。 / 我|wǒ|I; me / 在|zài|at; in; doing / 旁边|páng biān|beside; nearby / ， / 你|nǐ|you / 觉得|jué de|to feel; to think / 不对|bú duì|not right / ， / 就|jiù|then; in that case / 告诉|gào su|to tell / 我|wǒ|I; me / 。`),
        line("first-step", "horse", `好|hǎo|good; fine / ， / 我|wǒ|I; me / 先|xiān|first / 放下|fàng xià|to put down; to lower / 一只脚|yì zhī jiǎo|one foot / 。 / 水|shuǐ|water / 有一点|yǒu yì diǎn|a little; slightly / 凉|liáng|cool; chilly / ， / 可是|kě shì|but; however / 没有|méi yǒu|did not; have not / 把|bǎ|marks the object being acted on / 我|wǒ|I; me / 推走|tuī zǒu|to push away / 。 / 现在|xiàn zài|now / 水|shuǐ|water / 到了|dào le|reached; arrived at / 我|wǒ|I; me / 的|de|linking particle; of / 小腿|xiǎo tuǐ|lower leg; shin / ， / 比|bǐ|compared with / 牛伯伯|niú bó bo|Uncle Ox / 说|shuō|to say; to speak / 的|de|linking particle; of / 高|gāo|tall; high / 一些|yì xiē|some; a little / ， / 也|yě|also; too / 没有|méi yǒu|did not; have not / 小松鼠|xiǎo sōng shǔ|little squirrel / 说|shuō|to say; to speak / 的|de|linking particle; of / 那么|nà me|so; that much / 深|shēn|deep / 。 / 妈妈|mā ma|Mum; mother / ， / 我|wǒ|I; me / 站稳了|zhàn wěn le|am standing firmly now / ， / 可以|kě yǐ|can; may / 再|zài|then; again / 走|zǒu|to walk / 一步|yí bù|one step / 。`),
        line("across", null, `小马|xiǎo mǎ|little horse / 跟着|gēn zhe|following / 妈妈|mā ma|Mum; mother / ， / 一步一步|yí bù yí bù|step by step / 往前走|wǎng qián zǒu|to walk forward / 。 / 他|tā|he; him / 一边|yì biān|while (doing something) / 走|zǒu|to walk / ， / 一边|yì biān|while (doing something) / 看看|kàn kan|to take a look / 脚下|jiǎo xià|under one's feet / 的|de|linking particle; of / 路|lù|road; path / 。 / 走到|zǒu dào|to walk to / 河中间|hé zhōng jiān|the middle of the river / ， / 他|tā|he; him / 停了|tíng le|stopped / 一下|yí xià|all at once; briefly / ， / 等|děng|to wait; when / 自己|zì jǐ|oneself / 站稳|zhàn wěn|to stand firmly / ， / 再|zài|then; again / 慢慢|màn màn|slowly; gradually / 往前|wǎng qián|forward / 。 / 没有|méi yǒu|did not; have not / 多久|duō jiǔ|how long / ， / 他们|tā men|they; them / 走到|zǒu dào|to walk to / 了|le|change-of-state or completed-action particle / 河|hé|river / 那边|nà bian|the other side; over there / ， / 面粉|miàn fěn|flour / 还是|hái shi|still; remains / 干的|gān de|dry / 。`),
      ],
    },
    {
      id: "what-he-learned",
      type: "choice",
      label: "What changed his understanding?",
      "target-phrase": "一步一步",
      prompt: "What helped Little Horse understand the river better?",
      options: [
        option("shout", `他|tā|he; him / 比|bǐ|compared with / 小松鼠|xiǎo sōng shǔ|little squirrel / 说|shuō|to say; to speak / 得|de|links an action to how it is done / 更|gèng|even more / 大声|dà shēng|loudly / 。`),
        option("look", `他|tā|he; him / 听了|tīng le|heard; listened to / 朋友|péng you|friend / 的|de|linking particle; of / 话|huà|words; advice / ， / 也|yě|also; too / 小心地|xiǎo xīn de|carefully / 自己|zì jǐ|oneself / 看了看|kàn le kan|took a look / 。`),
        option("forget", `他|tā|he; him / 忘了|wàng le|forgot / 妈妈|mā ma|Mum; mother / 和|hé|and; with / 朋友|péng you|friend / 的|de|linking particle; of / 话|huà|words; advice / 。`),
      ],
      answer: ["look"],
      hint: "He combines other animals’ experiences with his own careful observations.",
      explanation: "He does not have to reject either friend. He learns more by listening, comparing, and carefully checking with his mother nearby.",
    },
    {
      id: "deliver-flour",
      type: "read",
      title: "第八幕 · 面粉送到了",
      lines: [
        line("delivery", "horse", `马叔叔|mǎ shū shu|Uncle Horse / ， / 您好|nín hǎo|hello (respectful) / ！ / 这是|zhè shì|this is / 妈妈|mā ma|Mum; mother / 让|ràng|to let; to allow / 我|wǒ|I; me / 送来的|sòng lái de|delivered here / 面粉|miàn fěn|flour / 。 / 对不起|duì bu qǐ|sorry / ， / 让|ràng|to let; to allow / 您|nín|you (respectful) / 等|děng|to wait; when / 了|le|change-of-state or completed-action particle / 这么久|zhè me jiǔ|so long / 。 / 我|wǒ|I; me / 今天|jīn tiān|today / 第一次|dì yī cì|the first time / 过河|guò hé|to cross a river / ， / 问了|wèn le|asked / 很多|hěn duō|many; a lot / 问题|wèn tí|question; problem / ， / 还|hái|still; also / 回家|huí jiā|to go home / 找了|zhǎo le|searched for / 妈妈|mā ma|Mum; mother / 。 / 现在|xiàn zài|now / 我|wǒ|I; me / 终于|zhōng yú|at last; finally / 把|bǎ|marks the object being acted on / 面粉|miàn fěn|flour / 送到了|sòng dào le|successfully delivered / ！`),
        line("uncle-welcome", "uncle", `谢谢|xiè xie|thank you / 你|nǐ|you / ， / 也|yě|also; too / 谢谢|xiè xie|thank you / 你|nǐ|you / 妈妈|mā ma|Mum; mother / 。 / 晚一点|wǎn yì diǎn|a little later / 没有关系|méi yǒu guān xi|it does not matter; that is all right / ， / 平安|píng ān|safe; in peace / 到这里|dào zhè lǐ|to arrive here / 更|gèng|even more / 重要|zhòng yào|important / 。 / 你|nǐ|you / 没有|méi yǒu|did not; have not / 为了|wèi le|in order to / 快一点|kuài yì diǎn|a little faster / 就|jiù|then; in that case / 乱跑|luàn pǎo|to run about recklessly / ， / 这|zhè|this / 很|hěn|very / 好|hǎo|good; fine / 。 / 你|nǐ|you / 看|kàn|to look / ， / 锅里|guō lǐ|in the pot / 的|de|linking particle; of / 水|shuǐ|water / 刚|gāng|just; just now / 开|kāi|to boil; to open / ， / 我们|wǒ men|we; us / 现在|xiàn zài|now / 一起|yì qǐ|together / 做|zuò|to do; to make / 面条|miàn tiáo|noodles / 吧|ba|suggestion particle / 。`),
        line("tell-lesson", "horse", `我|wǒ|I; me / 今天|jīn tiān|today / 知道|zhī dào|to know / 了|le|change-of-state or completed-action particle / ， / 同一条|tóng yì tiáo|the same (river or path) / 河|hé|river / ， / 对|duì|toward / 不一样|bù yí yàng|different / 的|de|linking particle; of / 朋友|péng you|friend / 来说|lái shuō|as far as ... is concerned (after 对) / ， / 可能|kě néng|might; possibly / 不一样|bù yí yàng|different / 深|shēn|deep / 。 / 我|wǒ|I; me / 不能|bù néng|cannot; must not / 只|zhǐ|only / 听|tīng|to listen to; to follow / 一句话|yí jù huà|one sentence; one piece of advice / ， / 也|yě|also; too / 不能|bù néng|cannot; must not / 什么|shén me|what; any / 都|dōu|always; all / 不|bù|not / 听|tīng|to listen to; to follow / 。 / 先|xiān|first / 问问|wèn wen|to ask around / ， / 再|zài|then; again / 看看|kàn kan|to take a look / ， / 想清楚|xiǎng qīng chu|to think through clearly / 以后|yǐ hòu|afterward; in the future / ， / 小心地|xiǎo xīn de|carefully / 一步一步|yí bù yí bù|step by step / 做|zuò|to do; to make / 。`),
      ],
    },
    {
      id: "journey-order",
      type: "order",
      label: "Put the learning in order",
      "target-phrase": "想清楚以后再做",
      prompt: "Put these parts of Little Horse’s journey in order.",
      options: [
        option("cross", `小马|xiǎo mǎ|little horse / 跟着|gēn zhe|following / 妈妈|mā ma|Mum; mother / ， / 小心地|xiǎo xīn de|carefully / 过河|guò hé|to cross a river / 。`),
        option("deliver", `小马|xiǎo mǎ|little horse / 把|bǎ|marks the object being acted on / 面粉|miàn fěn|flour / 送到了|sòng dào le|successfully delivered / 。`),
        option("listen", `小马|xiǎo mǎ|little horse / 听见|tīng jiàn|to hear / 两个|liǎng ge|two / 不一样|bù yí yàng|different / 的|de|linking particle; of / 回答|huí dá|answer; response / 。`),
        option("ask", `小马|xiǎo mǎ|little horse / 回家|huí jiā|to go home / ， / 和|hé|and; with / 妈妈|mā ma|Mum; mother / 一起|yì qǐ|together / 想办法|xiǎng bàn fǎ|to find a way / 。`),
      ],
      answer: ["listen", "ask", "cross", "deliver"],
      hint: "Different advice leads him to ask for help. Careful crossing happens before delivery.",
      explanation: "The order matters: he listens, thinks with help, checks carefully, and then completes the task. The ending grows from that process.",
    },
    {
      id: "homeward",
      type: "read",
      title: "第九幕 · 下次还要认真看看",
      lines: [
        line("thank-friends", null, `回家|huí jiā|to go home / 的|de|linking particle; of / 时候|shí hou|time; when / ， / 小马|xiǎo mǎ|little horse / 又|yòu|and then; also / 看见|kàn jiàn|to see / 了|le|change-of-state or completed-action particle / 牛伯伯|niú bó bo|Uncle Ox / 和|hé|and; with / 小松鼠|xiǎo sōng shǔ|little squirrel / 。 / 他|tā|he; him / 告诉|gào su|to tell / 他们|tā men|they; them / 面粉|miàn fěn|flour / 已经|yǐ jīng|already / 送到|sòng dào|to deliver to / ， / 也|yě|also; too / 谢谢|xiè xie|thank you / 他们|tā men|they; them / 帮忙|bāng máng|to help / 。 / 小松鼠|xiǎo sōng shǔ|little squirrel / 笑了|xiào le|smiled / ， / 牛伯伯|niú bó bo|Uncle Ox / 也|yě|also; too / 点点头|diǎn dian tóu|to nod / 。 / 两个|liǎng ge|two / 朋友|péng you|friend / 的|de|linking particle; of / 话|huà|words; advice / ， / 小马|xiǎo mǎ|little horse / 都|dōu|always; all / 记在了|jì zài le|kept in; remembered in / 心里|xīn li|in one's heart; inwardly / 。`),
        line("last-question", "horse", `妈妈|mā ma|Mum; mother / ， / 我|wǒ|I; me / 今天|jīn tiān|today / 会|huì|will; can / 过河|guò hé|to cross a river / 了|le|change-of-state or completed-action particle / 。 / 是不是|shì bu shì|is it the case that / 以后|yǐ hòu|afterward; in the future / 每次|měi cì|every time / 到了|dào le|reached; arrived at / 这里|zhè lǐ|here / ， / 都|dōu|always; all / 可以|kě yǐ|can; may / 马上|mǎ shàng|immediately / 过去|guò qu|to go across / 呢|ne|question particle / ？ / 我|wǒ|I; me / 还|hái|still; also / 想|xiǎng|to want; to think / 帮|bāng|to help / 你|nǐ|you / 送|sòng|to deliver; to take to / 很多|hěn duō|many; a lot / 东西|dōng xi|things / ， / 也|yě|also; too / 想|xiǎng|to want; to think / 把|bǎ|marks the object being acted on / 今天|jīn tiān|today / 学到|xué dào|to learn; to gain knowledge / 的|de|linking particle; of / 办法|bàn fǎ|method; way / ， / 告诉|gào su|to tell / 别的|bié de|other / 小马|xiǎo mǎ|little horse / 。`),
        line("next-time", "mother", `今天|jīn tiān|today / 你|nǐ|you / 做得|zuò de|did (followed by a description) / 很|hěn|very / 好|hǎo|good; fine / 。 / 可是|kě shì|but; however / ， / 下雨|xià yǔ|to rain / 以后|yǐ hòu|afterward; in the future / ， / 河水|hé shuǐ|river water / 可能|kě néng|might; possibly / 变深|biàn shēn|to become deeper / ， / 路|lù|road; path / 也|yě|also; too / 可能|kě néng|might; possibly / 不一样|bù yí yàng|different / 。 / 所以|suǒ yǐ|so; therefore / 下次|xià cì|next time / 来|lái|to come; to proceed / ， / 还是|hái shi|still; remains / 要|yào|need to; should / 先|xiān|first / 看看|kàn kan|to take a look / ， / 再|zài|then; again / 想想|xiǎng xiang|to think it over / 。 / 记住|jì zhù|to remember / 今天|jīn tiān|today / 学|xué|to learn / 的|de|linking particle; of / 办法|bàn fǎ|method; way / ， / 比|bǐ|compared with / 只|zhǐ|only / 记住|jì zhù|to remember / “ / 这条|zhè tiáo|this (river or road) / 河|hé|river / 很浅|hěn qiǎn|very shallow / ” / 更|gèng|even more / 有用|yǒu yòng|useful / 。`),
        line("promise", "horse", `我|wǒ|I; me / 记住|jì zhù|to remember / 了|le|change-of-state or completed-action particle / ！ / 听|tīng|to listen to; to follow / 别人|bié ren|other people / 说|shuō|to say; to speak / ， / 也|yě|also; too / 要|yào|need to; should / 自己|zì jǐ|oneself / 想|xiǎng|to want; to think / ； / 自己|zì jǐ|oneself / 想|xiǎng|to want; to think / 的|de|linking particle; of / 时候|shí hou|time; when / ， / 也|yě|also; too / 可以|kě yǐ|can; may / 请|qǐng|to ask; to invite / 别人|bié ren|other people / 帮忙|bāng máng|to help / 。 / 今天|jīn tiān|today / 是|shì|is; to be / 今天|jīn tiān|today / ， / 下次|xià cì|next time / 是|shì|is; to be / 下次|xià cì|next time / 。 / 我|wǒ|I; me / 会|huì|will; can / 先|xiān|first / 看看|kàn kan|to take a look / ， / 再|zài|then; again / 想想|xiǎng xiang|to think it over / ， / 不着急|bù zháo jí|not to hurry / ， / 一步一步|yí bù yí bù|step by step / 来|lái|to come; to proceed / 。`),
      ],
    },
    {
      id: "next-rain",
      type: "prediction",
      label: "Use the lesson again",
      "target-phrase": "下次还要先看看",
      prompt: "It rains before the next visit. What would show that Little Horse has learned the lesson?",
      options: [
        option("same", `他|tā|he; him / 觉得|jué de|to feel; to think / 上次|shàng cì|last time / 能过|néng guò|can cross / ， / 这次|zhè cì|this time / 一定|yí dìng|certainly; must / 能过|néng guò|can cross / 。`),
        option("new", `他|tā|he; him / 和|hé|and; with / 妈妈|mā ma|Mum; mother / 重新|chóng xīn|again; afresh / 看看|kàn kan|to take a look / 水|shuǐ|water / 有|yǒu|to have / 多深|duō shēn|how deep / 。`),
        option("never", `他|tā|he; him / 觉得|jué de|to feel; to think / 所有|suǒ yǒu|all / 的|de|linking particle; of / 河|hé|river / 都不能|dōu bù néng|none can; all cannot / 过|guò|to cross; to go across / 。`),
      ],
      answer: ["new"],
      hint: "Mother Horse says the water and route can change after rain.",
      explanation: "Good judgment responds to the situation now. One successful crossing does not make every future crossing safe, just as one animal’s experience does not fit every body.",
    },
  ],
}
