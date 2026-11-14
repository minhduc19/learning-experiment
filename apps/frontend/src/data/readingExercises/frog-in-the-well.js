// Elementary retelling of 井底之蛙 with an extended dialogue ending.
// Focus vocabulary: 青蛙、井、天空、大、小.
// Each paragraph is followed by two vocabulary and two story checkpoints.
const words = value => value.split(' / ').map(segment => {
  const [text, pinyin, meaning] = segment.split('|')
  return { text, pinyin, meaning }
})
const read = (id, title, value) => ({
  id, type: 'read', title, lines: [{ id: `${id}-paragraph`, speaker: null, words: words(value) }],
})
const quiz = (id, type, target, prompt, options, answer, hint, explanation) => ({
  id, type, label: prompt, 'target-phrase': target, prompt,
  options: options.map(([key, value]) => ({ id: key, words: words(value) })),
  answer, hint, explanation,
})
const vocabulary = {
  frog: '青蛙|qīng wā|frog', well: '井|jǐng|well', sky: '天空|tiān kōng|sky',
  big: '大|dà|big', small: '小|xiǎo|small', bird: '小鸟|xiǎo niǎo|little bird',
  water: '水|shuǐ|water', see: '看见|kàn jiàn|to see', outside: '外面|wài mian|outside',
  friend: '朋友|péng you|friend', hear: '听见|tīng jiàn|to hear', inside: '里面|lǐ mian|inside',
}
const vocab = (id, target, prompt, keys, answer, hint, explanation) => quiz(
  id, 'word', target, prompt, keys.map(key => [key, vocabulary[key]]), [answer], hint, explanation,
)

export const story = {
  createdAt: '2026-11-14T16:30:00Z',
  id: 'frog-in-the-well-v1',
  title: '井底之蛙',
  pinyin: 'Jǐng dǐ zhī wā',
  translation: 'The frog in the well',
  tagline: 'A CHINESE CLASSIC · A SMALL VIEW OF A BIG WORLD',
  characters: {},
  steps: [
    read('home', '第一幕 · 小小的家', `很久以前|hěn jiǔ yǐ qián|a long time ago / ， / 一只青蛙|yì zhī qīng wā|a frog / 住在|zhù zài|lived in / 一口井里|yì kǒu jǐng lǐ|a well / 。 / 井里|jǐng lǐ|inside the well / 有水|yǒu shuǐ|there was water / ， / 也有|yě yǒu|and there were / 小石头|xiǎo shí tou|small stones / 。 / 青蛙每天|qīng wā měi tiān|every day the frog / 在水里游|zài shuǐ lǐ yóu|swam in the water / ， / 累了|lèi le|when tired / 就坐在|jiù zuò zài|he would sit on / 石头上|shí tou shang|a stone / 看天空|kàn tiān kōng|and look at the sky / 。 / 青蛙说|qīng wā shuō|the frog said / ： / “ / 我的家|wǒ de jiā|my home / 真好|zhēn hǎo|is really nice / ！ / 井里的水|jǐng lǐ de shuǐ|the water in the well / 不冷不热|bù lěng bú rè|is neither cold nor hot / 。 / 天空|tiān kōng|the sky / 小小的|xiǎo xiǎo de|is very small / ， / 每天|měi tiān|every day / 都在上面|dōu zài shàng mian|it is always above me / 。 / 我坐在这里|wǒ zuò zài zhè lǐ|I sit here / ， / 就能看见|jiù néng kàn jiàn|and can see / 整个天空|zhěng ge tiān kōng|the whole sky / 。 / 井外面|jǐng wài mian|outside the well / 还有什么|hái yǒu shén me|what else is there / 呢|ne|question particle / ？ / ”`),
    vocab('frog-word', '青蛙', 'Choose the word for “frog”.', ['bird', 'frog', 'well'], 'frog', 'This is the animal living in the well.', '青蛙 means frog, the main character of this story.'),
    vocab('well-word', '井', 'Choose the word for “well” (a place to get water).', ['sky', 'water', 'well'], 'well', 'It is the frog’s home.', '井 means well. Its opening limits how much sky the frog sees.'),
    quiz('home-place', 'choice', '住在井里', 'Where does the frog live?', [
      ['well', '井里|jǐng lǐ|inside the well'], ['tree', '树上|shù shang|in a tree'], ['sky', '天空中|tiān kōng zhōng|in the sky'],
    ], ['well'], 'He swims and rests on stones in the same place.', 'The frog knows his home well, but has not yet seen the world outside it.'),
    quiz('first-belief', 'choice', '整个天空', 'What does the frog believe he can see from his stone?', [
      ['all', '整个天空|zhěng ge tiān kōng|the whole sky'], ['nothing', '什么也看不见|shén me yě kàn bu jiàn|he can see nothing'], ['outside', '井外面的路|jǐng wài mian de lù|the road outside the well'],
    ], ['all'], 'He says 整个天空.', 'He mistakes all the sky visible through the opening for all the sky there is.'),

    read('visitor', '第二幕 · 远方来的朋友', `一天早上|yì tiān zǎo shang|one morning / ， / 一只小鸟|yì zhī xiǎo niǎo|a little bird / 飞到井边|fēi dào jǐng biān|flew to the edge of the well / 。 / 青蛙抬起头|qīng wā tái qǐ tóu|the frog raised his head / 问|wèn|and asked / ： / “ / 你好|nǐ hǎo|hello / ！ / 你从哪里来|nǐ cóng nǎ lǐ lái|where do you come from / ？ / 你也住在|nǐ yě zhù zài|do you also live in / 井里吗|jǐng lǐ ma|a well / ？ / ” / 小鸟说|xiǎo niǎo shuō|the little bird said / ： / “ / 我住在|wǒ zhù zài|I live in / 大树上|dà shù shang|a big tree / 。 / 我飞过|wǒ fēi guo|I have flown over / 大山|dà shān|big mountains / ， / 也飞过|yě fēi guo|and also flown over / 小河|xiǎo hé|small rivers / 。 / 我飞了很久|wǒ fēi le hěn jiǔ|I have flown for a long time / ， / 想找点水喝|xiǎng zhǎo diǎn shuǐ hē|and want to find some water to drink / 。 / ” / 青蛙笑了|qīng wā xiào le|the frog laughed / ： / “ / 天空这么小|tiān kōng zhè me xiǎo|the sky is so small / ， / 你为什么|nǐ wèi shén me|why did you / 要飞那么久|yào fēi nà me jiǔ|need to fly so long / ？ / 你是不是|nǐ shì bu shì|are you perhaps / 飞错了路|fēi cuò le lù|flying the wrong way / ？ / ”`),
    vocab('water-word', '水', 'The bird wants a drink. Choose “water”.', ['well', 'water', 'sky'], 'water', 'It is what the frog swims in.', '水 means water. The bird comes to the well because it is thirsty.'),
    vocab('bird-word', '小鸟', 'Choose the phrase for “little bird”.', ['frog', 'friend', 'bird'], 'bird', 'This visitor can fly.', '小鸟 means little bird. 小 adds the meaning small or little.'),
    quiz('visit-reason', 'choice', '找点水喝', 'Why does the bird stop at the well?', [
      ['drink', '想喝水|xiǎng hē shuǐ|it wants to drink water'], ['home', '想住在井里|xiǎng zhù zài jǐng lǐ|it wants to live in the well'], ['laugh', '想笑青蛙|xiǎng xiào qīng wā|it wants to laugh at the frog'],
    ], ['drink'], 'The bird explains what it is looking for after a long flight.', 'The visit begins with an ordinary need, then gives the frog a chance to hear a different experience.'),
    quiz('flight-clue', 'choice', '飞了很久', 'Why does the long flight surprise the frog?', [
      ['small', '他以为|tā yǐ wéi|he assumes / 天空很小|tiān kōng hěn xiǎo|the sky is very small'], ['tired', '他也飞累了|tā yě fēi lèi le|he is tired from flying too'], ['dry', '井里没有水|jǐng lǐ méi yǒu shuǐ|there is no water in the well'],
    ], ['small'], 'Compare the bird’s journey with the frog’s description of the sky.', 'The bird’s experience does not fit the frog’s belief that the sky is small.'),

    read('different-views', '第三幕 · 天空大不大？', `小鸟说|xiǎo niǎo shuō|the little bird said / ： / “ / 天空很大|tiān kōng hěn dà|the sky is very big / ， / 大得很|dà de hěn|very big indeed / ！ / 我每天飞|wǒ měi tiān fēi|I fly every day / ， / 每天都能|měi tiān dōu néng|every day I can / 看见新地方|kàn jiàn xīn dì fang|see new places / 。 / ” / 青蛙摇摇头|qīng wā yáo yao tóu|the frog shook his head / ： / “ / 不对|bú duì|that is wrong / ！ / 我每天|wǒ měi tiān|every day I / 都看天空|dōu kàn tiān kōng|look at the sky / 。 / 天空只有|tiān kōng zhǐ yǒu|the sky is only / 井口那么大|jǐng kǒu nà me dà|as big as the well opening / 。 / 你看|nǐ kàn|look / ， / 从这边|cóng zhè biān|from this side / 到那边|dào nà biān|to that side / ， / 一点也不大|yì diǎn yě bú dà|it is not big at all / 。 / ” / 小鸟没有生气|xiǎo niǎo méi yǒu shēng qì|the bird did not get angry / ， / 轻轻地问|qīng qīng de wèn|and asked gently / ： / “ / 你看到的|nǐ kàn dào de|what you see / 是整个天空|shì zhěng ge tiān kōng|is it the whole sky / ， / 还是|hái shi|or / 井口上面|jǐng kǒu shàng mian|above the well opening / 的一小块|de yì xiǎo kuài|one small part / 呢|ne|question particle / ？ / ”`),
    vocab('big-word', '大', 'Choose the word for “big”.', ['small', 'big', 'sky'], 'big', 'The bird says 天空很大.', '大 means big. 很大 means very big.'),
    vocab('small-word', '小', 'Choose the word for “small”.', ['big', 'well', 'small'], 'small', 'The frog thinks the visible sky is small.', '小 means small, the opposite of 大.'),
    quiz('limited-view', 'choice', '一小块天空', 'What does the bird suggest the frog is actually seeing?', [
      ['part', '一小块天空|yì xiǎo kuài tiān kōng|a small part of the sky'], ['all', '整个天空|zhěng ge tiān kōng|the whole sky'], ['none', '没有天空|méi yǒu tiān kōng|no sky'],
    ], ['part'], 'The bird asks him to distinguish the whole from a small part.', 'The frog sees real sky, but the well opening limits his view of it.'),
    quiz('bird-tone', 'choice', '轻轻地问', 'How does the bird help the conversation continue?', [
      ['ask', '没有生气|méi yǒu shēng qì|it does not get angry / ， / 轻轻地问|qīng qīng de wèn|and asks gently'], ['shout', '大声叫他走|dà shēng jiào tā zǒu|it shouts at him to leave'], ['agree', '说天空很小|shuō tiān kōng hěn xiǎo|it says the sky is small'],
    ], ['ask'], 'Look at how the bird responds to 不对.', 'A calm question invites the frog to examine his view without pretending to agree with him.'),

    read('try-looking', '第四幕 · 换个地方看看', `青蛙想了想|qīng wā xiǎng le xiǎng|the frog thought for a moment / ， / 小声说|xiǎo shēng shuō|and said quietly / ： / “ / 我从来没有|wǒ cóng lái méi yǒu|I have never / 离开过井|lí kāi guo jǐng|left the well / 。 / 井外面|jǐng wài mian|outside the well / 真的很大吗|zhēn de hěn dà ma|is it really big / ？ / 我有一点怕|wǒ yǒu yì diǎn pà|I am a little afraid / 。 / ” / 小鸟说|xiǎo niǎo shuō|the little bird said / ： / “ / 你不用|nǐ bú yòng|you do not need to / 马上相信我|mǎ shàng xiāng xìn wǒ|believe me immediately / 。 / 你可以|nǐ kě yǐ|you can / 自己看看|zì jǐ kàn kan|look for yourself / 。 / 这口井不深|zhè kǒu jǐng bù shēn|this well is not deep / ， / 旁边有|páng biān yǒu|along the side there are / 大小不同|dà xiǎo bù tóng|different-sized / 的石头|de shí tou|stones / 。 / 慢慢上来|màn màn shàng lái|come up slowly / ， / 我在井边|wǒ zài jǐng biān|I am at the well's edge / 等你|děng nǐ|waiting for you / 。 / ” / 青蛙说|qīng wā shuō|the frog said / ： / “ / 好|hǎo|all right / ， / 我先跳到|wǒ xiān tiào dào|first I will jump onto / 这块大石头上|zhè kuài dà shí tou shang|this big stone / ， / 再往上走|zài wǎng shàng zǒu|then go farther up / 。 / 我要看看|wǒ yào kàn kan|I want to see / 井外面的天空|jǐng wài mian de tiān kōng|the sky outside the well / 。 / ”`),
    vocab('outside-word', '外面', 'Choose the word for “outside”.', ['inside', 'outside', 'water'], 'outside', 'The frog wants to see beyond the well.', '外面 means outside. 井外面 means outside the well.'),
    vocab('see-word', '看见', 'Choose the word for “to see”.', ['hear', 'see', 'friend'], 'see', 'This action uses your eyes.', '看见 means to see. The frog will compare what he sees from two places.'),
    quiz('check-plan', 'choice', '自己看看', 'What does the bird invite the frog to do?', [
      ['look', '换个地方|huàn ge dì fang|move to another place / 看看|kàn kan|and take a look'], ['obey', '不看就相信|bú kàn jiù xiāng xìn|believe without looking'], ['stay', '一直留在井里|yì zhí liú zài jǐng lǐ|stay in the well forever'],
    ], ['look'], 'The bird says he need not believe immediately.', 'Changing his viewing position gives the frog a way to check the claim himself.'),
    quiz('new-view', 'prediction', '井外面的天空', 'What is the frog likely to see after reaching the top?', [
      ['more', '更多的天空|gèng duō de tiān kōng|more of the sky'], ['smaller', '更小的天空|gèng xiǎo de tiān kōng|a smaller view of the sky'], ['none', '没有天空|méi yǒu tiān kōng|no sky'],
    ], ['more'], 'The well walls will no longer surround his view.', 'Moving past the opening should reveal what the well walls hid from him.'),

    read('outside', '第五幕 · 原来这么大', `青蛙来到|qīng wā lái dào|the frog reached / 井外面|jǐng wài mian|the outside of the well / ， / 先看看左边|xiān kàn kan zuǒ biān|first looked left / ， / 再看看右边|zài kàn kan yòu biān|then looked right / 。 / 他看见|tā kàn jiàn|he saw / 大树|dà shù|big trees / 、 / 小花|xiǎo huā|small flowers / 和远处的山|hé yuǎn chù de shān|and mountains in the distance / 。 / 青蛙叫起来|qīng wā jiào qǐ lái|the frog cried out / ： / “ / 天空真大|tiān kōng zhēn dà|the sky really is big / ！ / 左边有天空|zuǒ biān yǒu tiān kōng|there is sky to the left / ， / 右边也有天空|yòu biān yě yǒu tiān kōng|and sky to the right too / ！ / 我以前|wǒ yǐ qián|I used to / 看见的天空|kàn jiàn de tiān kōng|the sky I saw / 那么小|nà me xiǎo|was so small / ， / 原来只是|yuán lái zhǐ shì|it turns out it was only / 一小块|yì xiǎo kuài|a small part / 。 / ” / 小鸟问|xiǎo niǎo wèn|the little bird asked / ： / “ / 是天空|shì tiān kōng|was it the sky / 变大了吗|biàn dà le ma|that became bigger / ？ / ” / 青蛙说|qīng wā shuō|the frog said / ： / “ / 不是|bú shì|no / ！ / 天空一直很大|tiān kōng yì zhí hěn dà|the sky was big all along / ， / 是我以前|shì wǒ yǐ qián|it was that before I / 站的地方|zhàn de dì fang|the place where I stood / 不一样|bù yí yàng|was different / 。 / ”`),
    vocab('sky-word', '天空', 'Choose the word for “sky”.', ['well', 'sky', 'frog'], 'sky', 'The frog now sees much more of it above him.', '天空 means sky. It did not grow when the frog climbed out.'),
    vocab('big-review', '大', 'Complete the meaning: 天空很大 = “The sky is very ___.”', ['small', 'water', 'big'], 'big', 'Compare 大 with its opposite 小.', '大 means big. The frog now uses the same description as the bird.'),
    quiz('what-changed', 'choice', '站的地方不一样', 'What changed when the frog left the well?', [
      ['sky', '天空变大了|tiān kōng biàn dà le|the sky became bigger'], ['view', '他看的地方变了|tā kàn de dì fang biàn le|the place he looked from changed'], ['bird', '小鸟变小了|xiǎo niǎo biàn xiǎo le|the bird became smaller'],
    ], ['view'], 'The frog says 天空一直很大.', 'His view changed; the sky was already big. The new evidence corrects his earlier conclusion.'),
    quiz('journey-order', 'order', '先听，再看', 'Put the frog’s learning in order.', [
      ['outside', '到井外看天空|dào jǐng wài kàn tiān kōng|look at the sky outside the well'], ['small', '以为天空很小|yǐ wéi tiān kōng hěn xiǎo|assume the sky is small'], ['change', '知道天空很大|zhī dào tiān kōng hěn dà|learn that the sky is big'], ['bird', '听小鸟说|tīng xiǎo niǎo shuō|hear the bird say / 天空很大|tiān kōng hěn dà|the sky is big'],
    ], ['small', 'bird', 'outside', 'change'], 'His first belief comes before the bird’s visit; his own look comes before his new conclusion.', 'He hears a different account, checks it, and then changes his mind based on what he sees.'),

    read('lesson', '第六幕 · 小小的井，大大的世界', `青蛙看着|qīng wā kàn zhe|the frog looked at / 小小的井|xiǎo xiǎo de jǐng|the small well / ， / 对小鸟说|duì xiǎo niǎo shuō|and said to the little bird / ： / “ / 井还是|jǐng hái shi|the well is still / 我的家|wǒ de jiā|my home / ， / 我还是喜欢|wǒ hái shi xǐ huan|I still like / 井里的水|jǐng lǐ de shuǐ|the water in the well / 。 / 可是|kě shì|but / 我的家小|wǒ de jiā xiǎo|my home is small / ， / 不表示|bù biǎo shì|that does not mean / 天空也小|tiān kōng yě xiǎo|the sky is small too / 。 / 谢谢你|xiè xie nǐ|thank you / 让我看看|ràng wǒ kàn kan|for letting me see / 外面|wài mian|outside / 。 / ” / 小鸟说|xiǎo niǎo shuō|the little bird said / ： / “ / 你愿意|nǐ yuàn yì|you were willing / 自己看|zì jǐ kàn|to look for yourself / ， / 也愿意问|yě yuàn yì wèn|and willing to ask / ， / 这很好|zhè hěn hǎo|that is good / 。 / ” / 青蛙又问|qīng wā yòu wèn|the frog asked again / ： / “ / 大山后面|dà shān hòu mian|behind the big mountains / 还有什么|hái yǒu shén me|what else is there / ？ / 我还没看过|wǒ hái méi kàn guo|I have not seen it yet / ， / 你能告诉我吗|nǐ néng gào su wǒ ma|can you tell me / ？ / ” / 小鸟笑着说|xiǎo niǎo xiào zhe shuō|the bird said smiling / ： / “ / 来|lái|come / ， / 我们慢慢说|wǒ men màn màn shuō|let us talk about it slowly / 。 / ”`),
    vocab('friend-word', '朋友', 'Choose the word for “friend”, like the bird has become.', ['friend', 'frog', 'outside'], 'friend', 'It describes someone you enjoy and trust.', '朋友 means friend. The bird helps through conversation and an invitation to look.'),
    vocab('small-review', '小', 'Complete the meaning: 小小的井 = “a very ___ well”.', ['big', 'small', 'bird'], 'small', 'His home stays the same size.', '小 means small. Repeating it in 小小的 emphasizes its small size.'),
    quiz('home-meaning', 'choice', '家小，天空不小', 'What does the frog understand about his home now?', [
      ['hate', '井小|jǐng xiǎo|the well is small / ， / 所以不喜欢家|suǒ yǐ bù xǐ huan jiā|so he dislikes his home'], ['both', '可以喜欢井|kě yǐ xǐ huan jǐng|he can like the well / ， / 也知道天空大|yě zhī dào tiān kōng dà|and know the sky is big'], ['same', '井外和井里|jǐng wài hé jǐng lǐ|outside and inside the well / 都一样|dōu yí yàng|are all the same'],
    ], ['both'], 'He still likes the water in his home.', 'Learning that his view was limited does not require rejecting his home. He can value it while understanding a wider world.'),
    quiz('next-question', 'prediction', '我还没看过', 'If the frog hears about a place he has never seen, how is he likely to respond now?', [
      ['deny', '说那里一定很小|shuō nà lǐ yí dìng hěn xiǎo|say it must be small'], ['ask', '先问一问|xiān wèn yi wèn|first ask about it / ， / 有机会再看看|yǒu jī huì zài kàn kan|then look when he has a chance'], ['all', '说自己全知道|shuō zì jǐ quán zhī dào|say he already knows everything'],
    ], ['ask'], 'His last question starts by admitting he has not seen beyond the mountains.', 'He has learned to ask and check rather than treat his own small view as complete knowledge.'),
  ],
}
