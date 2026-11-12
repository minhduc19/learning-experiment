// An original elementary adaptation of 狐假虎威, from 战国策·楚策一.
// The second visit and final dialogue expand the classic to explore its meaning.
// Each paragraph or dialogue turn contains individually annotated words and phrases.
const words = value => value.split(' / ').map(segment => {
  const [text, pinyin, meaning] = segment.split('|')
  return { text, pinyin, meaning }
})
const line = (id, speaker, value) => ({ id, speaker, words: words(value) })
const option = (id, value) => ({ id, words: words(value) })

export const story = {
  id: "fox-tiger-v1",
  title: "狐假虎威",
  pinyin: "Hú jiǎ hǔ wēi",
  translation: "The fox borrows the tiger’s power",
  tagline: "A CHINESE CLASSIC · WHO ARE THEY AFRAID OF?",
  characters: {
    "fox": {
      "name": "狐狸 · Fox",
      "avatar": "狐"
    },
    "tiger": {
      "name": "老虎 · Tiger",
      "avatar": "虎"
    },
    "rabbit": {
      "name": "兔子 · Rabbit",
      "avatar": "兔"
    },
    "deer": {
      "name": "小鹿 · Deer",
      "avatar": "鹿"
    }
  },
  steps: [
    {
      id: "forest",
      type: "read",
      title: "第一幕 · 山里的早上",
      lines: [
        line("quiet-morning", null, `一天|yì tiān|one day / 早上|zǎo shang|morning / ， / 山里|shān lǐ|in the mountains; in the forest / 的|de|possessive marker / 动物|dòng wù|animal / 都|dōu|all / 出来|chū lai|to come out / 找吃的|zhǎo chī de|to look for food / 。 / 兔子|tù zi|rabbit / 在|zài|at; in the process of / 树下|shù xià|under a tree / 吃草|chī cǎo|to graze; to eat grass / ， / 小鹿|xiǎo lù|little deer / 在|zài|at; in the process of / 河边|hé biān|the riverside / 喝水|hē shuǐ|to drink water / 。 / 大家|dàjiā|everyone / 一边|yì biān|while (doing something) / 吃|chī|to eat / 东西|dōngxi|things / ， / 一边|yì biān|while (doing something) / 看看|kàn kan|to take a look / 四周|sì zhōu|all around / 。 / 这里|zhèlǐ|here / 有|yǒu|to have / 一只|yì zhī|one (animal) / 老虎|lǎo hǔ|tiger / ， / 身体|shēn tǐ|body / 很大|hěn dà|very big / ， / 跑得|pǎo de|runs (followed by a description) / 很快|hěn kuài|very fast / 。 / 大家|dàjiā|everyone / 都|dōu|all / 怕|pà|to fear; to be afraid of / 他|tā|he / ， / 听见|tīng jiàn|to hear / 他|tā|he / 的|de|possessive marker / 声音|shēng yīn|voice; sound / ， / 就|jiù|then; soon / 会|huì|will / 找|zhǎo|look for / 地方|dì fang|place / 躲起来|duǒ qǐ lai|to hide oneself / 。`),
        line("rabbit-warning", "rabbit", `小鹿|xiǎo lù|little deer / ， / 你|nǐ|you / 今天|jīn tiān|today / 也|yě|also / 来|lái|to come / 这里|zhèlǐ|here / 喝水|hē shuǐ|to drink water / 吗|ma|question particle / ？ / 先|xiān|first / 看看|kàn kan|to take a look / 后面|hòu mian|behind; at the back / ， / 再|zài|again / 慢慢|màn màn|slowly; gradually / 喝|hē|drink / 。 / 我|wǒ|I / 刚才|gāngcái|just now / 好像|hǎo xiàng|to seem; as if / 听见|tīng jiàn|to hear / 老虎|lǎo hǔ|tiger / 的|de|possessive marker / 声音|shēng yīn|voice; sound / 了|le|completed action / 。 / 你|nǐ|you / 看|kàn|look / ， / 那边|nà bian|the other side; over there / 的|de|possessive marker / 草|cǎo|grass / 在|zài|at; in the process of / 动|dòng|to move / ， / 我们|wǒmen|we / 先|xiān|first / 站到|zhàn dào|to move to a standing position at / 树后面|shù hòu mian|behind the tree / 吧|ba|suggestion particle / 。 / 要是|yào shi|if / 老虎|lǎo hǔ|tiger / 来了|lái le|has come; is coming / ， / 我们|wǒmen|we / 就|jiù|then; soon / 赶快|gǎn kuài|quickly; right away / 走|zǒu|to walk / 。`),
        line("tiger-hungry", "tiger", `我|wǒ|I / 已经|yǐjīng|already / 走|zǒu|to walk / 了|le|completed action / 很久|hěn jiǔ|a long time / ， / 肚子|dù zi|belly / 真|zhēn|really / 饿|è|hungry / 。 / 怎么|zěn me|how / 一个动物|yí ge dòng wù|a single animal / 也|yě|also / 看不见|kàn bu jiàn|cannot see / ？ / 我|wǒ|I / 走到|zǒu dào|to walk to / 哪里|nǎ lǐ|where / ， / 哪里|nǎ lǐ|where / 就|jiù|then; soon / 变得|biàn de|to become / 安安静静|ān ān jìng jìng|very quiet / 。 / 今天|jīn tiān|today / 一定|yídìng|certainly / 要|yào|want; will / 找|zhǎo|look for / 一点|yì diǎn|a little / 吃的|chī de|food; something to eat / 。 / 前面|qián mian|in front; ahead / 那棵|nà kē|that (tree) / 树下|shù xià|under a tree / ， / 好像|hǎo xiàng|to seem; as if / 有|yǒu|to have / 一条|yì tiáo|one (river or road) / 红色|hóng sè|red / 的|de|possessive marker / 尾巴|wěi ba|tail / 。`),
      ],
    },
    {
      id: "caught",
      type: "read",
      title: "第二幕 · 狐狸想办法",
      lines: [
        line("fox-caught", null, `老虎|lǎo hǔ|tiger / 轻轻|qīng qīng|gently; quietly / 走过去|zǒu guò qu|to walk over / ， / 看见|kànjiàn|see / 一只|yì zhī|one (animal) / 狐狸|hú li|fox / 正在|zhèng zài|in the process of / 树下|shù xià|under a tree / 找东西|zhǎo dōng xi|to look for something / 。 / 他|tā|he / 一下|yí xià|all at once; briefly / 抓住|zhuā zhù|to grab; to catch / 狐狸|hú li|fox / ， / 把|bǎ|object marker / 狐狸|hú li|fox / 拉到|lā dào|to pull to / 自己|zì jǐ|oneself / 面前|miàn qián|in front of someone / 。 / 狐狸|hú li|fox / 的|de|possessive marker / 腿|tuǐ|leg / 有一点|yǒu yì diǎn|a little; slightly / 发抖|fā dǒu|to tremble / ， / 心里|xīn lǐ|in one’s heart / 很|hěn|very / 害怕|hài pà|afraid / 。 / 可是|kěshì|but / 他|tā|he / 没有|méiyǒu|not have; have not / 马上|mǎshàng|right away / 叫出来|jiào chū lai|to cry out / ， / 而是|ér shì|but rather / 看着|kàn zhe|looking at / 老虎|lǎo hǔ|tiger / ， / 想|xiǎng|miss; want / 一个|yí ge|one / 让|ràng|to let; to allow / 自己|zì jǐ|oneself / 离开|lí kāi|to leave / 的|de|possessive marker / 办法|bàn fǎ|method; way / 。`),
        line("tiger-question", "tiger", `原来是你|yuán lái shì nǐ|so it is you / ！ / 我|wǒ|I / 找了|zhǎo le|searched for / 半天|bàn tiān|half a day; a long time / ， / 终于|zhōng yú|finally / 找到|zhǎo dào|to find successfully / 吃的|chī de|food; something to eat / 了|le|completed action / 。 / 你|nǐ|you / 为什么|wèishénme|why / 不|bù|not / 跑|pǎo|run / ？ / 大家|dàjiā|everyone / 看见|kànjiàn|see / 我|wǒ|I / 都|dōu|all / 跑|pǎo|run / ， / 你|nǐ|you / 却|què|yet; but / 站在|zhàn zài|to stand at / 这里|zhèlǐ|here / 看着|kàn zhe|looking at / 我|wǒ|I / 。 / 难道|nán dào|could it be that (rhetorical question) / 你|nǐ|you / 不怕|bú pà|not afraid / 我|wǒ|I / 吗|ma|question particle / ？ / 我|wǒ|I / 的|de|possessive marker / 牙|yá|teeth / 很|hěn|very / 长|cháng|long / ， / 力气|lì qi|physical strength / 也|yě|also / 比|bǐ|compared with / 你|nǐ|you / 大|dà|big; strong / 。`),
        line("fox-claim", "fox", `你|nǐ|you / 先|xiān|first / 别|bié|don’t / 吃|chī|to eat / 我|wǒ|I / ！ / 天上|tiān shang|in the sky; in heaven / 的|de|possessive marker / 大王|dà wáng|king; ruler / 派|pài|to send; to appoint / 我|wǒ|I / 来|lái|to come / 管|guǎn|to be in charge of / 山里|shān lǐ|in the mountains; in the forest / 的|de|possessive marker / 动物|dòng wù|animal / 。 / 这里|zhèlǐ|here / 的|de|possessive marker / 动物|dòng wù|animal / 都|dōu|all / 怕|pà|to fear; to be afraid of / 我|wǒ|I / ， / 连|lián|even / 你|nǐ|you / 也|yě|also / 应该|yīng gāi|should / 听我的话|tīng wǒ de huà|to listen to me; to obey me / 。 / 你|nǐ|you / 要是|yào shi|if / 吃|chī|to eat / 了|le|completed action / 我|wǒ|I / ， / 天上|tiān shang|in the sky; in heaven / 的|de|possessive marker / 大王|dà wáng|king; ruler / 会|huì|will / 不高兴|bù gāo xìng|unhappy / 。 / 你|nǐ|you / 看|kàn|look / 我|wǒ|I / 小|xiǎo|small; young / ， / 可|kě|really; indeed (emphasis) / 不能|bù néng|cannot; must not / 只看|zhǐ kàn|to look only at / 我|wǒ|I / 的|de|possessive marker / 身体|shēn tǐ|body / 。`),
      ],
    },
    {
      id: "claim-quiz",
      type: "choice",
      label: "A claim is not proof",
      "target-phrase": "大家都怕我",
      prompt: "What does Fox claim, rather than prove?",
      options: [
        option("claim", `他|tā|he / 是|shì|be / 来|lái|to come / 管|guǎn|to be in charge of / 动物|dòng wù|animal / 的|de|possessive marker / ， / 大家|dàjiā|everyone / 都|dōu|all / 怕|pà|to fear; to be afraid of / 他|tā|he / 。`),
        option("truth", `他|tā|he / 已经|yǐjīng|already / 看见|kànjiàn|see / 老虎|lǎo hǔ|tiger / 回家|huí jiā|go home / 了|le|completed action / 。`),
        option("food", `他|tā|he / 只|zhǐ|only / 想|xiǎng|miss; want / 找|zhǎo|look for / 一碗|yì wǎn|a bowl of / 面条|miàn tiáo|noodles / 。`),
      ],
      answer: ["claim"],
      hint: "Listen to Fox’s explanation of why Tiger should not eat him.",
      explanation: "Fox claims that he has authority over the animals. At this point we have only his words, not evidence that the animals fear him.",
    },
    {
      id: "walking-plan",
      type: "read",
      title: "第三幕 · 谁走在前面？",
      lines: [
        line("tiger-doubt", "tiger", `你|nǐ|you / 说|shuō|to say; to speak / 大家|dàjiā|everyone / 都|dōu|all / 怕|pà|to fear; to be afraid of / 你|nǐ|you / ， / 可是|kěshì|but / 你|nǐ|you / 的|de|possessive marker / 身体|shēn tǐ|body / 这么|zhè me|so; this much / 小|xiǎo|small; young / ， / 声音|shēng yīn|voice; sound / 也|yě|also / 不|bù|not / 大|dà|big; strong / 。 / 我|wǒ|I / 从来没有|cóng lái méi yǒu|have never / 听说过|tīng shuō guo|have heard of / 这件事|zhè jiàn shì|this matter / 。 / 你|nǐ|you / 有|yǒu|to have / 什么|shén me|what; anything / 办法|bàn fǎ|method; way / 让|ràng|to let; to allow / 我|wǒ|I / 知道|zhīdao|know / ， / 你|nǐ|you / 说|shuō|to say; to speak / 的|de|possessive marker / 是|shì|be / 真的|zhēn de|true; real / ？ / 不要|bú yào|do not / 只|zhǐ|only / 说|shuō|to say; to speak / 好听|hǎo tīng|nice-sounding; pleasant / 的|de|possessive marker / 话|huà|words; advice / ， / 让|ràng|to let; to allow / 我|wǒ|I / 亲眼|qīn yǎn|with one's own eyes / 看看|kàn kan|to take a look / 。`),
        line("fox-plan", "fox", `这|zhè|this / 很|hěn|very / 容易|róng yì|easy / 。 / 你|nǐ|you / 跟着|gēn zhe|following / 我|wǒ|I / 到|dào|arrive / 山里|shān lǐ|in the mountains; in the forest / 走一走|zǒu yi zǒu|to take a walk / ， / 就|jiù|then; soon / 知道|zhīdao|know / 了|le|completed action / 。 / 我|wǒ|I / 走在|zǒu zài|to walk in (a position) / 前面|qián mian|in front; ahead / ， / 你|nǐ|you / 走在|zǒu zài|to walk in (a position) / 后面|hòu mian|behind; at the back / 。 / 看看|kàn kan|to take a look / 路上|lù shang|on the road; along the way / 的|de|possessive marker / 动物|dòng wù|animal / ， / 是不是|shì bu shì|is it the case that / 一看见|yí kàn jiàn|as soon as one sees / 我|wǒ|I / 就|jiù|then; soon / 跑|pǎo|run / 。 / 你|nǐ|you / 只要|zhǐ yào|as long as; only need to / 跟着|gēn zhe|following / 走|zǒu|to walk / ， / 不用|bú yòng|no need to / 说|shuō|to say; to speak / 话|huà|words; advice / ， / 也|yě|also / 不用|bú yòng|no need to / 做|zuò|make / 别的|bié de|other / 事|shì|matter; thing / 。`),
        line("agree", null, `老虎|lǎo hǔ|tiger / 想了想|xiǎng le xiǎng|thought it over / ， / 慢慢|màn màn|slowly; gradually / 松开了|sōng kāi le|let go of; loosened / 爪子|zhuǎ zi|paws; claws / 。 / 狐狸|hú li|fox / 走|zǒu|to walk / 了|le|completed action / 几步|jǐ bù|a few steps / ， / 又|yòu|and then; also / 回头|huí tóu|to turn one's head back / 看看|kàn kan|to take a look / 。 / 老虎|lǎo hǔ|tiger / 果然|guǒ rán|sure enough / 跟在|gēn zài|to follow behind / 他|tā|he / 后面|hòu mian|behind; at the back / 。 / 狐狸|hú li|fox / 把|bǎ|object marker / 头|tóu|head / 抬高|tái gāo|to raise higher / ， / 尾巴|wěi ba|tail / 也|yě|also / 抬高|tái gāo|to raise higher / ， / 好像|hǎo xiàng|to seem; as if / 一点|yì diǎn|a little / 都|dōu|all / 不怕|bú pà|not afraid / 。 / 他|tā|he / 心里|xīn lǐ|in one’s heart / 却|què|yet; but / 一直在想|yì zhí zài xiǎng|kept thinking / ： / 老虎|lǎo hǔ|tiger / 一定|yídìng|certainly / 要|yào|want; will / 跟着|gēn zhe|following / 我|wǒ|I / ， / 不能|bù néng|cannot; must not / 走到|zǒu dào|to walk to / 别的|bié de|other / 地方|dì fang|place / 去|qù|go / 。`),
      ],
    },
    {
      id: "position-blanks",
      type: "blanks",
      label: "The plan depends on position",
      "target-phrase": "前面和后面",
      prompt: "Complete the walking arrangement that makes Fox’s trick possible.",
      before: words(`狐狸|hú li|fox / 走在|zǒu zài|to walk in (a position)`),
      between: words(`， / 老虎|lǎo hǔ|tiger / 跟在|gēn zài|to follow behind`),
      after: words(`。`),
      options: [
        option("back", `后面|hòu mian|behind; at the back`),
        option("home", `家里|jiā lǐ|at home`),
        option("front", `前面|qián mian|in front; ahead`),
        option("water", `水里|shuǐ lǐ|in the water`),
      ],
      answer: ["front", "back"],
      hint: "Fox wants the other animals to see him first, with Tiger still visible behind him.",
      explanation: "Fox walks in front and Tiger follows behind. The arrangement lets Fox take credit for a reaction that Tiger’s presence causes.",
    },
    {
      id: "rabbit-runs",
      type: "read",
      title: "第四幕 · 兔子看见了谁？",
      lines: [
        line("rabbit-notices", "rabbit", `小鹿|xiǎo lù|little deer / ， / 快|kuài|quickly / 看|kàn|look / ！ / 狐狸|hú li|fox / 往这边|wǎng zhè bian|toward here / 来了|lái le|has come; is coming / 。 / 他|tā|he / 今天|jīn tiān|today / 走得|zǒu de|walks (followed by a description) / 真|zhēn|really / 慢|màn|slow; slowly / ， / 还|hái|still; also / 把|bǎ|object marker / 头|tóu|head / 抬得|tái de|raised (followed by a description) / 那么|nà me|so; that much / 高|gāo|tall; high / 。 / 可是|kěshì|but / ， / 等一等|děng yi děng|wait a moment / ， / 他|tā|he / 后面|hòu mian|behind; at the back / 是谁|shì shéi|who is it? / ？ / 是|shì|be / 老虎|lǎo hǔ|tiger / ！ / 老虎|lǎo hǔ|tiger / 跟在|gēn zài|to follow behind / 他|tā|he / 后面|hòu mian|behind; at the back / ！ / 我们|wǒmen|we / 快走|kuài zǒu|leave quickly; hurry away / ， / 不要|bú yào|do not / 站在|zhàn zài|to stand at / 这里|zhèlǐ|here / 了|le|completed action / 。`),
        line("animals-flee", null, `兔子|tù zi|rabbit / 放下|fàng xià|to put down; to lower / 嘴边|zuǐ biān|beside the mouth / 的|de|possessive marker / 草|cǎo|grass / ， / 马上|mǎshàng|right away / 跑到|pǎo dào|to run to / 大树|dà shù|big tree / 后面|hòu mian|behind; at the back / 。 / 小鹿|xiǎo lù|little deer / 也|yě|also / 从|cóng|from / 河边|hé biān|the riverside / 跑开了|pǎo kāi le|ran away / 。 / 狐狸|hú li|fox / 看见|kànjiàn|see / 他们|tā men|they; them / 跑|pǎo|run / ， / 心里|xīn lǐ|in one’s heart / 高兴起来|gāo xìng qǐ lai|to become happy / 。 / 他|tā|he / 停了|tíng le|stopped / 一下|yí xià|all at once; briefly / ， / 指着|zhǐ zhe|pointing at / 树后面|shù hòu mian|behind the tree / ， / 又|yòu|and then; also / 指着|zhǐ zhe|pointing at / 河边|hé biān|the riverside / ， / 好让|hǎo ràng|so that / 老虎|lǎo hǔ|tiger / 看清楚|kàn qīng chu|to see clearly / 。`),
        line("fox-credit", "fox", `你|nǐ|you / 看见|kànjiàn|see / 了|le|completed action / 吗|ma|question particle / ？ / 刚才|gāngcái|just now / 他们|tā men|they; them / 还在|hái zài|is still there / 这里|zhèlǐ|here / 吃草|chī cǎo|to graze; to eat grass / 、 / 喝水|hē shuǐ|to drink water / ， / 我|wǒ|I / 一来|yì lái|as soon as one arrives / ， / 他们|tā men|they; them / 就|jiù|then; soon / 跑|pǎo|run / 了|le|completed action / 。 / 我|wǒ|I / 还|hái|still; also / 没有|méiyǒu|not have; have not / 说|shuō|to say; to speak / 一句话|yí jù huà|a single sentence; a word / 呢|ne|question particle / ！ / 现在|xiànzài|now / 你|nǐ|you / 知道|zhīdao|know / 大家|dàjiā|everyone / 有|yǒu|to have / 多|duō|more / 怕|pà|to fear; to be afraid of / 我|wǒ|I / 了|le|completed action / 吧|ba|suggestion particle / ？ / 别停下|bié tíng xià|do not stop / ， / 前面|qián mian|in front; ahead / 还有|hái yǒu|and also / 别的|bié de|other / 动物|dòng wù|animal / ， / 我们|wǒmen|we / 再|zài|again / 往前走走|wǎng qián zǒu zou|to walk a little farther forward / 。`),
      ],
    },
    {
      id: "fear-word",
      type: "word",
      label: "Read the reaction",
      "target-phrase": "怕",
      prompt: "Which word means “to be afraid”, explaining why Rabbit and Deer run?",
      options: [
        option("fear", `怕|pà|to fear; to be afraid of`),
        option("happy", `笑|xiào|to smile; to laugh`),
        option("wait", `等|děng|wait`),
        option("drink", `喝|hē|drink`),
      ],
      answer: ["fear"],
      hint: "They run as soon as Rabbit notices Tiger behind Fox.",
      explanation: "怕 means to be afraid. Their fear is real, but Fox’s explanation of its cause is misleading.",
    },
    {
      id: "cause-quiz",
      type: "choice",
      label: "Look beyond the first thing you see",
      "target-phrase": "他们怕的是老虎",
      prompt: "Why do Rabbit and Deer actually run away?",
      options: [
        option("fox", `因为|yīn wèi|because / 狐狸|hú li|fox / 的|de|possessive marker / 尾巴|wěi ba|tail / 很|hěn|very / 高|gāo|tall; high / 。`),
        option("tiger", `因为|yīn wèi|because / 他们|tā men|they; them / 看见|kànjiàn|see / 了|le|completed action / 狐狸|hú li|fox / 后面|hòu mian|behind; at the back / 的|de|possessive marker / 老虎|lǎo hǔ|tiger / 。`),
        option("water", `因为|yīn wèi|because / 河|hé|river / 里|lǐ|inside / 没有|méiyǒu|not have; have not / 水|shuǐ|water / 了|le|completed action / 。`),
      ],
      answer: ["tiger"],
      hint: "Rabbit names the animal behind Fox immediately before calling for Deer to run.",
      explanation: "They are frightened by Tiger. Fox’s arrival and their running happen together, but that does not mean Fox himself causes their fear.",
    },
    {
      id: "tiger-believes",
      type: "read",
      title: "第五幕 · 老虎相信了",
      lines: [
        line("more-animals", null, `他们|tā men|they; them / 又|yòu|and then; also / 走|zǒu|to walk / 了|le|completed action / 一段路|yí duàn lù|a stretch of road / 。 / 路边|lù biān|beside the road / 的|de|possessive marker / 小动物|xiǎo dòng wù|small animals / 一看见|yí kàn jiàn|as soon as one sees / 老虎|lǎo hǔ|tiger / ， / 也|yě|also / 都|dōu|all / 跑开了|pǎo kāi le|ran away / 。 / 老虎|lǎo hǔ|tiger / 只看见|zhǐ kàn jiàn|to see only / 动物|dòng wù|animal / 跑|pǎo|run / ， / 却|què|yet; but / 没有|méiyǒu|not have; have not / 认真|rèn zhēn|carefully; conscientiously / 想|xiǎng|miss; want / 他们|tā men|they; them / 在|zài|at; in the process of / 看|kàn|look / 谁|shéi|who / 。 / 走到|zǒu dào|to walk to / 一块|yí kuài|one (piece; rock) / 大石头|dà shí tou|big rock / 旁边|pángbiān|beside / ， / 他|tā|he / 停下|tíng xià|to stop / 脚步|jiǎo bù|steps; footsteps / ， / 不想|bù xiǎng|do not want to / 再|zài|again / 往前走|wǎng qián zǒu|to walk forward / 了|le|completed action / 。`),
        line("tiger-convinced", "tiger", `我|wǒ|I / 看见|kànjiàn|see / 了|le|completed action / ， / 大家|dàjiā|everyone / 真的|zhēn de|true; real / 都|dōu|all / 跑|pǎo|run / 了|le|completed action / 。 / 看来|kàn lái|it seems / ， / 你|nǐ|you / 没有|méiyǒu|not have; have not / 说错|shuō cuò|to say something wrong / 。 / 我|wǒ|I / 这么大的|zhè me dà de|so big / 身体|shēn tǐ|body / ， / 也|yě|also / 没有|méiyǒu|not have; have not / 让|ràng|to let; to allow / 你|nǐ|you / 害怕|hài pà|afraid / ； / 你|nǐ|you / 这么小的|zhè me xiǎo de|so small / 身体|shēn tǐ|body / ， / 却|què|yet; but / 让|ràng|to let; to allow / 大家|dàjiā|everyone / 都|dōu|all / 跑|pǎo|run / 了|le|completed action / 。 / 今天|jīn tiān|today / 我|wǒ|I / 不|bù|not / 吃|chī|to eat / 你|nǐ|you / 了|le|completed action / ， / 你|nǐ|you / 走|zǒu|to walk / 吧|ba|suggestion particle / ， / 我|wǒ|I / 去|qù|go / 别的|bié de|other / 地方|dì fang|place / 看看|kàn kan|to take a look / 。`),
        line("fox-alone", null, `狐狸|hú li|fox / 一听|yì tīng|on hearing this / ， / 马上|mǎshàng|right away / 点点头|diǎn dian tóu|to nod / 。 / 他|tā|he / 等|děng|wait / 老虎|lǎo hǔ|tiger / 走远|zǒu yuǎn|to go far away / ， / 才|cái|only then; as a result / 慢慢|màn màn|slowly; gradually / 坐下来|zuò xià lai|to sit down / 。 / 他|tā|he / 的|de|possessive marker / 腿|tuǐ|leg / 还在|hái zài|is still there / 发抖|fā dǒu|to tremble / ， / 可是|kěshì|but / 现在|xiànzài|now / 不用怕|bú yòng pà|no need to be afraid / 了|le|completed action / 。 / 他|tā|he / 看看|kàn kan|to take a look / 自己|zì jǐ|oneself / ， / 又|yòu|and then; also / 看看|kàn kan|to take a look / 老虎|lǎo hǔ|tiger / 离开|lí kāi|to leave / 的|de|possessive marker / 路|lù|road; path / ， / 轻轻地|qīng qīng de|softly; gently / 说|shuō|to say; to speak / ： / “ / 还好|hái hǎo|fortunately; luckily / ， / 他|tā|he / 一直|yìzhí|all along / 走在|zǒu zài|to walk in (a position) / 我|wǒ|I / 后面|hòu mian|behind; at the back / 。 / ”`),
      ],
    },
    {
      id: "alone-prediction",
      type: "prediction",
      label: "Test the explanation",
      "target-phrase": "没有老虎的时候",
      prompt: "What would best test whether the animals are afraid of Fox himself?",
      options: [
        option("louder", `狐狸|hú li|fox / 把|bǎ|object marker / 同样|tóng yàng|the same / 的|de|possessive marker / 话|huà|words; advice / 说|shuō|to say; to speak / 得|de|links an action to how it is done / 更|gèng|even more / 大声|dà shēng|loudly / 。`),
        option("alone", `看看|kàn kan|to take a look / 狐狸|hú li|fox / 一个人|yí ge rén|alone; by oneself / 来时|lái shí|when one comes / ， / 动物|dòng wù|animal / 会|huì|will / 不会|bú huì|will not; cannot / 跑|pǎo|run / 。`),
        option("same", `让|ràng|to let; to allow / 老虎|lǎo hǔ|tiger / 继续|jì xù|to continue / 跟在|gēn zài|to follow behind / 狐狸|hú li|fox / 后面|hòu mian|behind; at the back / 。`),
      ],
      answer: ["alone"],
      hint: "To understand Tiger’s role, imagine the same visit without Tiger.",
      explanation: "Seeing Fox alone helps separate Fox’s own effect from Tiger’s presence. Repeating the same arrangement would not settle which animal causes the fear.",
    },
    {
      id: "fox-alone-visit",
      type: "read",
      title: "第六幕 · 狐狸一个人来了",
      lines: [
        line("back-to-river", null, `第二天|dì èr tiān|the next day / ， / 狐狸|hú li|fox / 又|yòu|and then; also / 来到|lái dào|to arrive at / 河边|hé biān|the riverside / 。 / 这一次|zhè yí cì|this time / ， / 他|tā|he / 是|shì|be / 一个人|yí ge rén|alone; by oneself / 来|lái|to come / 的|de|possessive marker / 。 / 兔子|tù zi|rabbit / 在|zài|at; in the process of / 吃草|chī cǎo|to graze; to eat grass / ， / 小鹿|xiǎo lù|little deer / 在|zài|at; in the process of / 喝水|hē shuǐ|to drink water / ， / 和|hé|and; with / 昨天|zuó tiān|yesterday / 一样|yí yàng|the same / 。 / 狐狸|hú li|fox / 把|bǎ|object marker / 头|tóu|head / 抬高|tái gāo|to raise higher / ， / 像|xiàng|like; as / 昨天|zuó tiān|yesterday / 那样|nà yàng|that way; like that / 走过去|zǒu guò qu|to walk over / ， / 等着|děng zhe|waiting for / 他们|tā men|they; them / 马上|mǎshàng|right away / 跑开|pǎo kāi|to run away / 。 / 可是|kěshì|but / 兔子|tù zi|rabbit / 只是|zhǐ shì|only; merely / 看|kàn|look / 了|le|completed action / 他|tā|he / 一眼|yì yǎn|one glance / 。`),
        line("fox-surprised", "fox", `你们|nǐmen|you (plural) / 怎么|zěn me|how / 不|bù|not / 跑|pǎo|run / ？ / 昨天|zuó tiān|yesterday / 我|wǒ|I / 刚|gāng|just; just now / 走到|zǒu dào|to walk to / 这里|zhèlǐ|here / ， / 你们|nǐmen|you (plural) / 就|jiù|then; soon / 跑|pǎo|run / 了|le|completed action / 。 / 今天|jīn tiān|today / 我|wǒ|I / 也|yě|also / 走到|zǒu dào|to walk to / 这里|zhèlǐ|here / ， / 和|hé|and; with / 昨天|zuó tiān|yesterday / 一样|yí yàng|the same / 。 / 你们|nǐmen|you (plural) / 不怕|bú pà|not afraid / 我|wǒ|I / 了|le|completed action / 吗|ma|question particle / ？ / 还是|hái shi|or (introducing another possibility) / 你们|nǐmen|you (plural) / 忘了|wàng le|forgot / 昨天|zuó tiān|yesterday / 的|de|possessive marker / 事|shì|matter; thing / ？ / 我可是|wǒ kě shì|I really am (emphasis) / 来|lái|to come / 管|guǎn|to be in charge of / 山里|shān lǐ|in the mountains; in the forest / 的|de|possessive marker / 动物|dòng wù|animal / 的|de|possessive marker / ！`),
        line("rabbit-explains", "rabbit", `我们|wǒmen|we / 昨天|zuó tiān|yesterday / 怕的是|pà de shì|the one being feared is / 你|nǐ|you / 后面|hòu mian|behind; at the back / 的|de|possessive marker / 老虎|lǎo hǔ|tiger / ， / 不是|bú shì|is not / 你|nǐ|you / 。 / 昨天|zuó tiān|yesterday / 你|nǐ|you / 往前走|wǎng qián zǒu|to walk forward / ， / 老虎|lǎo hǔ|tiger / 也|yě|also / 往前走|wǎng qián zǒu|to walk forward / ， / 我们|wǒmen|we / 当然|dāng rán|of course / 要|yào|want; will / 跑|pǎo|run / 。 / 今天|jīn tiān|today / 这里只有|zhè lǐ zhǐ yǒu|here there is only / 你|nǐ|you / ， / 老虎|lǎo hǔ|tiger / 不在|bú zài|is not here; is absent / ， / 我们|wǒmen|we / 为什么|wèishénme|why / 要|yào|want; will / 跑|pǎo|run / ？ / 你|nǐ|you / 说|shuō|to say; to speak / 大家|dàjiā|everyone / 都|dōu|all / 怕|pà|to fear; to be afraid of / 你|nǐ|you / ， / 可|kě|really; indeed (emphasis) / 你|nǐ|you / 自己也|zì jǐ yě|oneself also / 很|hěn|very / 怕|pà|to fear; to be afraid of / 老虎|lǎo hǔ|tiger / 吧|ba|suggestion particle / ？`),
      ],
    },
    {
      id: "compare-visits",
      type: "choice",
      label: "Notice what changed",
      "target-phrase": "昨天和今天不一样",
      prompt: "What important difference explains the animals’ different reactions?",
      options: [
        option("grass", `今天|jīn tiān|today / 的|de|possessive marker / 草|cǎo|grass / 比|bǐ|compared with / 昨天|zuó tiān|yesterday / 高|gāo|tall; high / 。`),
        option("tiger", `昨天|zuó tiān|yesterday / 有|yǒu|to have / 老虎|lǎo hǔ|tiger / ， / 今天|jīn tiān|today / 没有|méiyǒu|not have; have not / 老虎|lǎo hǔ|tiger / 。`),
        option("fox", `狐狸|hú li|fox / 今天|jīn tiān|today / 没有尾巴|méi yǒu wěi ba|does not have a tail / 。`),
      ],
      answer: ["tiger"],
      hint: "Fox tries to copy his walk, but he cannot copy the animal that was behind him.",
      explanation: "Tiger’s presence changes between the visits. That difference explains why the animals run on one day but not the other.",
    },
    {
      id: "tiger-returns",
      type: "read",
      title: "第七幕 · 再问一句为什么",
      lines: [
        line("tiger-hears", null, `这时|zhè shí|at this moment / ， / 老虎|lǎo hǔ|tiger / 正|zhèng|just; at this moment / 从|cóng|from / 远处|yuǎn chù|in the distance / 走过来|zǒu guò lai|to walk across toward here / 。 / 他|tā|he / 听见|tīng jiàn|to hear / 兔子|tù zi|rabbit / 的|de|possessive marker / 话|huà|words; advice / ， / 停在|tíng zài|to stop at / 树后面|shù hòu mian|behind the tree / ， / 没有|méiyǒu|not have; have not / 马上|mǎshàng|right away / 出来|chū lai|to come out / 。 / 他|tā|he / 想起|xiǎng qǐ|to recall; to think back to / 昨天|zuó tiān|yesterday / 的|de|possessive marker / 事|shì|matter; thing / ， / 看看|kàn kan|to take a look / 狐狸|hú li|fox / ， / 又|yòu|and then; also / 看看|kàn kan|to take a look / 兔子|tù zi|rabbit / ， / 终于|zhōng yú|finally / 开始|kāi shǐ|to begin / 明白了|míng bai le|understood / 。 / 原来|yuán lái|so it turns out / 大家|dàjiā|everyone / 一直|yìzhí|all along / 看着|kàn zhe|looking at / 的|de|possessive marker / 是|shì|be / 他|tā|he / ， / 不是|bú shì|is not / 狐狸|hú li|fox / 。`),
        line("tiger-asks", "tiger", `狐狸|hú li|fox / ， / 我|wǒ|I / 再问|zài wèn|to ask again / 你|nǐ|you / 一次|yí cì|once; one time / ： / 他们|tā men|they; them / 昨天|zuó tiān|yesterday / 到底|dào dǐ|actually; on earth (in a question) / 怕|pà|to fear; to be afraid of / 谁|shéi|who / ？ / 你|nǐ|you / 让|ràng|to let; to allow / 我|wǒ|I / 跟在|gēn zài|to follow behind / 后面|hòu mian|behind; at the back / ， / 是|shì|be / 因为|yīn wèi|because / 你|nǐ|you / 需要|xū yào|to need / 我|wǒ|I / 吧|ba|suggestion particle / ？ / 我|wǒ|I / 只看见|zhǐ kàn jiàn|to see only / 他们|tā men|they; them / 跑|pǎo|run / ， / 就|jiù|then; soon / 相信|xiāng xìn|to believe / 你|nǐ|you / 的|de|possessive marker / 话|huà|words; advice / ， / 没有|méiyǒu|not have; have not / 想清楚|xiǎng qīng chu|to think through clearly / 为什么|wèishénme|why / 。 / 这一次|zhè yí cì|this time / ， / 我|wǒ|I / 想|xiǎng|miss; want / 听|tīng|to listen to; to follow / 一个|yí ge|one / 真的|zhēn de|true; real / 回答|huí dá|answer; response / 。`),
        line("fox-admits", "fox", `是|shì|be / 的|de|possessive marker / ， / 他们|tā men|they; them / 怕的是|pà de shì|the one being feared is / 你|nǐ|you / 。 / 我|wǒ|I / 昨天|zuó tiān|yesterday / 太|tài|too / 害怕|hài pà|afraid / 了|le|completed action / ， / 想|xiǎng|miss; want / 快一点|kuài yì diǎn|a little faster / 离开|lí kāi|to leave / ， / 才|cái|only then; as a result / 想出了|xiǎng chū le|thought up; came up with / 那个办法|nà ge bàn fǎ|that plan / 。 / 我|wǒ|I / 借了|jiè le|borrowed; made use of / 你|nǐ|you / 的|de|possessive marker / 威风|wēi fēng|powerful presence; intimidating air / ， / 让|ràng|to let; to allow / 你|nǐ|you / 以为|yǐ wéi|to think (mistakenly) / 大家|dàjiā|everyone / 怕|pà|to fear; to be afraid of / 我|wǒ|I / 。 / 其实|qí shí|actually; in fact / 我|wǒ|I / 没有|méiyǒu|not have; have not / 那么|nà me|so; that much / 大|dà|big; strong / 的|de|possessive marker / 本事|běn shi|ability; skill / ， / 也|yě|also / 不是|bú shì|is not / 谁|shéi|who / 派来|pài lái|sent here / 管|guǎn|to be in charge of / 大家|dàjiā|everyone / 的|de|possessive marker / 。`),
      ],
    },
    {
      id: "sequence",
      type: "order",
      label: "Follow the misunderstanding",
      "target-phrase": "先看看，再问为什么",
      prompt: "Put these events in order to show how the trick works and is understood.",
      options: [
        option("alone", `狐狸|hú li|fox / 一个人|yí ge rén|alone; by oneself / 来|lái|to come / ， / 动物|dòng wù|animal / 没有|méiyǒu|not have; have not / 跑|pǎo|run / 。`),
        option("plan", `狐狸|hú li|fox / 让|ràng|to let; to allow / 老虎|lǎo hǔ|tiger / 跟在|gēn zài|to follow behind / 后面|hòu mian|behind; at the back / 。`),
        option("admit", `狐狸|hú li|fox / 说出|shuō chū|to say openly; to state / 大家|dàjiā|everyone / 怕的是|pà de shì|the one being feared is / 老虎|lǎo hǔ|tiger / 。`),
        option("run", `动物|dòng wù|animal / 看见|kànjiàn|see / 老虎|lǎo hǔ|tiger / ， / 赶快|gǎn kuài|quickly; right away / 跑开|pǎo kāi|to run away / 。`),
      ],
      answer: ["plan", "run", "alone", "admit"],
      hint: "The walking arrangement comes first. The visit without Tiger happens before Fox admits the truth.",
      explanation: "The first visit creates the mistaken explanation. Comparing it with a visit without Tiger reveals the missing cause.",
    },
    {
      id: "ending",
      type: "read",
      title: "第八幕 · 谁的威风？",
      lines: [
        line("deer-speaks", "deer", `狐狸|hú li|fox / ， / 你|nǐ|you / 想|xiǎng|miss; want / 保护|bǎo hù|to protect / 自己|zì jǐ|oneself / ， / 我们|wǒmen|we / 能|néng|can; to be able to / 明白|míng bai|to understand / 。 / 可是|kěshì|but / ， / 你|nǐ|you / 不能|bù néng|cannot; must not / 因为|yīn wèi|because / 老虎|lǎo hǔ|tiger / 在|zài|at; in the process of / 后面|hòu mian|behind; at the back / ， / 就|jiù|then; soon / 说|shuō|to say; to speak / 大家|dàjiā|everyone / 都|dōu|all / 应该|yīng gāi|should / 听|tīng|to listen to; to follow / 你|nǐ|you / 的|de|possessive marker / 话|huà|words; advice / 。 / 别人|bié ren|other people / 怕|pà|to fear; to be afraid of / 老虎|lǎo hǔ|tiger / ， / 不等于|bù děng yú|is not the same as; does not mean / 你|nǐ|you / 有道理|yǒu dào lǐ|to be reasonable; to make sense / 。 / 我们|wǒmen|we / 也|yě|also / 不想|bù xiǎng|do not want to / 每天|měi tiān|every day / 都|dōu|all / 因为|yīn wèi|because / 害怕|hài pà|afraid / ， / 连|lián|even / 水|shuǐ|water / 都不能|dōu bù néng|none can; all cannot / 好好|hǎo hǎo|properly; carefully / 喝|hē|drink / 。`),
        line("tiger-reflects", "tiger", `你们|nǐmen|you (plural) / 说得对|shuō de duì|are right; said it correctly / 。 / 我|wǒ|I / 也|yě|also / 不能|bù néng|cannot; must not / 因为|yīn wèi|because / 身体|shēn tǐ|body / 大|dà|big; strong / ， / 就|jiù|then; soon / 觉得|jué de|to feel; to think / 自己|zì jǐ|oneself / 什么都知道|shén me dōu zhī dào|to know everything / 。 / 昨天|zuó tiān|yesterday / 我|wǒ|I / 一直跟着|yì zhí gēn zhe|to keep following / 走|zǒu|to walk / ， / 却|què|yet; but / 没有|méiyǒu|not have; have not / 好好想|hǎo hǎo xiǎng|to think carefully / 。 / 以后|yǐhòu|after / 听到|tīng dào|to hear / 一个|yí ge|one / 说法|shuō fǎ|claim; explanation / ， / 我|wǒ|I / 要|yào|want; will / 多|duō|more / 看看|kàn kan|to take a look / ， / 也|yě|also / 多|duō|more / 问|wèn|to ask / 一句|yí jù|one sentence; one question / ： / 真的|zhēn de|true; real / 是|shì|be / 这样|zhè yàng|like this / 吗|ma|question particle / ？ / 为什么|wèishénme|why / ？`),
        line("closing", null, `后来|hòu lái|later / ， / 人们|rén men|people / 把|bǎ|object marker / 借着|jiè zhe|making use of; borrowing / 别人|bié ren|other people / 的|de|possessive marker / 力量|lì liang|power; strength / 吓唬|xià hu|to frighten; to intimidate / 人|rén|person; people / 的|de|possessive marker / 事|shì|matter; thing / ， / 叫作|jiào zuò|to be called / “ / 狐假虎威|hú jiǎ hǔ wēi|the fox borrows the tiger's power; to bully using another's power / ” / 。 / 这里|zhèlǐ|here / 的|de|possessive marker / “ / 假|jiǎ|to borrow; to make use of (in 狐假虎威) / ” / 是|shì|be / 借用|jiè yòng|to borrow; to make use of / 的|de|possessive marker / 意思|yì si|meaning / ， / 不是|bú shì|is not / 假装|jiǎ zhuāng|to pretend / 的|de|possessive marker / “ / 假|jiǎ|false; pretend (the everyday meaning) / ” / 。 / 狐狸|hú li|fox / 借了|jiè le|borrowed; made use of / 老虎|lǎo hǔ|tiger / 的|de|possessive marker / 威风|wēi fēng|powerful presence; intimidating air / ， / 可是|kěshì|but / 老虎|lǎo hǔ|tiger / 一走|yì zǒu|as soon as one leaves / ， / 大家|dàjiā|everyone / 就|jiù|then; soon / 看清了|kàn qīng le|saw clearly; understood / 。 / 看见|kànjiàn|see / 别人|bié ren|other people / 跑|pǎo|run / ， / 先|xiān|first / 别|bié|don’t / 急着|jí zhe|to be in a hurry to / 下结论|xià jié lùn|to draw a conclusion / ， / 还|hái|still; also / 要|yào|want; will / 看看|kàn kan|to take a look / 他们|tā men|they; them / 到底|dào dǐ|actually; on earth (in a question) / 在|zài|at; in the process of / 怕|pà|to fear; to be afraid of / 谁|shéi|who / 。`),
      ],
    },
    {
      id: "meaning",
      type: "choice",
      label: "Understand the title",
      "target-phrase": "借别人的力量",
      prompt: "What does 假 mean in 狐假虎威?",
      options: [
        option("fake", `老虎|lǎo hǔ|tiger / 是|shì|be / 假的|jiǎ de|fake; not real / 。`),
        option("borrow", `狐狸|hú li|fox / 借|jiè|to borrow; to make use of / 老虎|lǎo hǔ|tiger / 的|de|possessive marker / 力量|lì liang|power; strength / 吓唬|xià hu|to frighten; to intimidate / 别人|bié ren|other people / 。`),
        option("help", `狐狸|hú li|fox / 教|jiāo|to teach / 动物|dòng wù|animal / 一起|yì qǐ|together / 过河|guò hé|to cross a river / 。`),
      ],
      answer: ["borrow"],
      hint: "Fox does not turn into a tiger. He uses the real tiger behind him.",
      explanation: "Here 假 means to borrow or make use of. The idiom describes using someone else’s power to intimidate others; it does not mean the tiger is fake.",
    },
  ],
}
