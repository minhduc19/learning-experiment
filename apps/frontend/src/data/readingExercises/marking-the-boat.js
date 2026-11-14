// Elementary adaptation of 刻舟求剑, with an extended learner ending.
// Focus vocabulary: 船、剑、找、记号、办法.
// Every paragraph is followed by three checkpoints. Lookups annotate short phrases.
const words = value => value.split(' / ').map(segment => {
  const [text, pinyin, meaning] = segment.split('|')
  return { text, pinyin, meaning }
})
const option = (id, value) => ({ id, words: words(value) })
const read = (id, title, value) => ({
  id, type: 'read', title, lines: [{ id: `${id}-paragraph`, speaker: null, words: words(value) }],
})
const quiz = (id, type, target, prompt, options, answer, hint, explanation) => ({
  id, type, label: prompt, 'target-phrase': target, prompt,
  options: options.map(([key, value]) => option(key, value)), answer, hint, explanation,
})

export const story = {
  createdAt: '2026-11-14T11:00:00Z',
  id: 'marking-the-boat-v1',
  title: '刻舟求剑',
  pinyin: 'Kè zhōu qiú jiàn',
  translation: 'Marking the boat to find a sword',
  tagline: 'A CHINESE CLASSIC · A MOVING BOAT AND A FIXED IDEA',
  characters: {},
  steps: [
    read('boarding', '第一幕 · 带着剑上船', `很久以前|hěn jiǔ yǐ qián|a long time ago / ， / 有一个人|yǒu yí ge rén|there was a man / 要过河|yào guò hé|who wanted to cross a river / 。 / 他带着|tā dài zhe|he was carrying / 一把剑|yì bǎ jiàn|a sword / ， / 来到河边|lái dào hé biān|and came to the riverbank / ， / 找到|zhǎo dào|found / 一条小船|yì tiáo xiǎo chuán|a small boat / 。 / 船上的老人|chuán shang de lǎo rén|the old man on the boat / 说|shuō|said / ： / “ / 上船吧|shàng chuán ba|come aboard / ， / 我送你|wǒ sòng nǐ|I will take you / 过河|guò hé|across the river / 。 / ” / 那个人问|nà ge rén wèn|the man asked / ： / “ / 船小不小|chuán xiǎo bu xiǎo|is the boat small / ？ / 我的剑|wǒ de jiàn|my sword / 放在哪里|fàng zài nǎ lǐ|where should I put it / ？ / ” / 老人说|lǎo rén shuō|the old man said / ： / “ / 放好你的剑|fàng hǎo nǐ de jiàn|put your sword somewhere secure / ， / 坐在中间|zuò zài zhōng jiān|sit in the middle / 。 / 船会动|chuán huì dòng|the boat will move / ， / 不要|bú yào|do not / 站在船边|zhàn zài chuán biān|stand at the edge of the boat / 。 / ” / 那个人点头|nà ge rén diǎn tóu|the man nodded / ， / 却把剑|què bǎ jiàn|but the sword / 放在船边|fàng zài chuán biān|he put by the boat's edge / 。`),
    quiz('trip', 'choice', '过河', 'Why does the man get on the boat?', [
      ['cross', '过河|guò hé|to cross the river'], ['buy', '买剑|mǎi jiàn|to buy a sword'], ['mark', '找记号|zhǎo jì hao|to look for a mark'],
    ], ['cross'], 'He reaches the river before he meets the old man.', 'The boat is transport across the river. Its movement will matter later.'),
    quiz('boat-word', 'word', '船', 'Which word names the object that will carry him across?', [
      ['sword', '剑|jiàn|sword'], ['boat', '船|chuán|boat'], ['method', '办法|bàn fǎ|method'],
    ], ['boat'], 'It carries people on water.', '船 means boat. Keep track of where the boat is as the story continues.'),
    quiz('warning', 'prediction', '放在船边', 'What problem could putting the sword at the edge cause?', [
      ['fall', '剑可能|jiàn kě néng|the sword might / 掉进水里|diào jìn shuǐ lǐ|fall into the water'], ['grow', '剑会长大|jiàn huì zhǎng dà|the sword will grow bigger'], ['stop', '河水会停|hé shuǐ huì tíng|the river water will stop'],
    ], ['fall'], 'The old man warns that the boat moves.', 'The sword is not secure. This predicts a problem caused by ignoring the warning.'),

    read('falling', '第二幕 · 剑掉了', `船离开河边|chuán lí kāi hé biān|the boat left the bank / ， / 慢慢向前走|màn màn xiàng qián zǒu|and slowly moved forward / 。 / 那个人|nà ge rén|the man / 低头看水|dī tóu kàn shuǐ|looked down at the water / 。 / 船动了一下|chuán dòng le yí xià|the boat moved a little / ， / 剑就|jiàn jiù|then the sword / 掉进水里|diào jìn shuǐ lǐ|fell into the water / 。 / 他大声说|tā dà shēng shuō|he said loudly / ： / “ / 我的剑|wǒ de jiàn|my sword / 掉了|diào le|has fallen / ！ / 我要找剑|wǒ yào zhǎo jiàn|I want to find my sword / ！ / ” / 老人问|lǎo rén wèn|the old man asked / ： / “ / 从哪里掉的|cóng nǎ lǐ diào de|where did it fall from / ？ / 我们先|wǒ men xiān|first let us / 记住这个地方|jì zhù zhè ge dì fang|remember this place / ， / 再想办法|zài xiǎng bàn fǎ|then think of a way / 。 / ” / 那个人说|nà ge rén shuō|the man said / ： / “ / 我看见了|wǒ kàn jiàn le|I saw it / ， / 就是这里|jiù shì zhè lǐ|right here / ！ / 不用着急|bú yòng zháo jí|no need to worry / ， / 我有办法|wǒ yǒu bàn fǎ|I have a method / 。 / 找剑|zhǎo jiàn|finding the sword / 不难|bù nán|is not difficult / 。 / ” / 老人看看水|lǎo rén kàn kan shuǐ|the old man looked at the water / ， / 又看看船|yòu kàn kan chuán|then looked at the boat / 。`),
    quiz('sword-place', 'choice', '剑掉进水里', 'Where is the sword now?', [
      ['boat', '在船上|zài chuán shang|on the boat'], ['water', '在水里|zài shuǐ lǐ|in the water'], ['home', '在家里|zài jiā lǐ|at home'],
    ], ['water'], 'The man shouts after something falls.', 'The sword is in the river. It is no longer being carried by the boat.'),
    quiz('find-word', 'word', '找', 'Which word expresses what the man wants to do about his missing sword?', [
      ['sit', '坐|zuò|to sit'], ['find', '找|zhǎo|to look for'], ['move', '动|dòng|to move'],
    ], ['find'], 'He says 我要找剑.', '找 means to look for. A useful search needs the location of the missing object.'),
    quiz('remember', 'choice', '记住这个地方', 'What does the old man want to remember?', [
      ['fall-place', '剑落水的地方|jiàn luò shuǐ de dì fang|the place where the sword fell into the water'], ['price', '剑的价钱|jiàn de jià qian|the price of the sword'], ['name', '船的名字|chuán de míng zi|the name of the boat'],
    ], ['fall-place'], 'He asks where the sword fell from.', 'He focuses on the river location, which will remain important even after the boat moves.'),

    read('marking', '第三幕 · 船上的记号', `那个人拿出|nà ge rén ná chū|the man took out / 一把小刀|yì bǎ xiǎo dāo|a small knife / ， / 在船边|zài chuán biān|on the edge of the boat / 刻了一个记号|kè le yí ge jì hao|carved a mark / 。 / 老人问|lǎo rén wèn|the old man asked / ： / “ / 你在做什么|nǐ zài zuò shén me|what are you doing / ？ / ” / 他指着记号|tā zhǐ zhe jì hao|he pointed at the mark / 说|shuō|and said / ： / “ / 剑从这里|jiàn cóng zhè lǐ|from here the sword / 掉下去|diào xià qù|fell down / 。 / 我做个记号|wǒ zuò ge jì hao|I am making a mark / ， / 就不会忘|jiù bú huì wàng|so I will not forget / 。 / 等船到了|děng chuán dào le|when the boat arrives / ， / 我就从|wǒ jiù cóng|I will then from / 记号下面|jì hao xià mian|below the mark / 找剑|zhǎo jiàn|look for the sword / 。 / ” / 老人说|lǎo rén shuō|the old man said / ： / “ / 记号在船上|jì hao zài chuán shang|the mark is on the boat / ， / 剑在水里|jiàn zài shuǐ lǐ|the sword is in the water / 。 / 船还在走|chuán hái zài zǒu|the boat is still moving / 啊|a|you see / ！ / ” / 他笑着说|tā xiào zhe shuō|he said smiling / ： / “ / 没关系|méi guān xi|it does not matter / ， / 记号不会跑|jì hao bú huì pǎo|the mark cannot run away / 。 / 这就是|zhè jiù shì|this is exactly / 我的好办法|wǒ de hǎo bàn fǎ|my good method / 。 / ”`),
    quiz('mark-word', 'word', '记号', 'What does 记号 mean in his plan?', [
      ['mark', '记号|jì hao|mark; sign'], ['knife', '小刀|xiǎo dāo|small knife'], ['river', '河|hé|river'],
    ], ['mark'], 'He carves it into the edge of the boat.', 'A 记号 can help someone remember a position, but its usefulness depends on what it is attached to.'),
    quiz('mark-location', 'choice', '记号在船上', 'What has he actually marked?', [
      ['river', '河底的位置|hé dǐ de wèi zhi|a position on the riverbed'], ['boat', '船上的位置|chuán shang de wèi zhi|a position on the boat'], ['bank', '岸上的树|àn shang de shù|a tree on the bank'],
    ], ['boat'], 'His knife touches the boat, not the riverbed.', 'The mark records a place on the moving boat. It does not fix a place in the river.'),
    quiz('moving-mark', 'prediction', '船还在走', 'As the boat moves on, what will happen to the mark?', [
      ['stay', '留在原来的水面上|liú zài yuán lái de shuǐ miàn shang|it stays above the original patch of water'], ['follow', '跟着船走|gēn zhe chuán zǒu|it moves with the boat'], ['sword', '跟着剑走|gēn zhe jiàn zǒu|it moves with the sword'],
    ], ['follow'], 'The mark is carved into the boat itself.', 'The mark can stay unchanged on the boat while its position over the river changes.'),

    read('arrival', '第四幕 · 船走了，剑没走', `过了一会儿|guò le yí huìr|after a while / ， / 船到了对岸|chuán dào le duì àn|the boat reached the opposite bank / 。 / 那个人|nà ge rén|the man / 马上找记号|mǎ shàng zhǎo jì hao|immediately looked for the mark / ， / 又向|yòu xiàng|then toward / 记号下面|jì hao xià mian|the area below the mark / 的水里|de shuǐ lǐ|in the water / 看了又看|kàn le yòu kàn|looked again and again / 。 / 他问|tā wèn|he asked / ： / “ / 记号还在|jì hao hái zài|the mark is still here / ， / 我的剑呢|wǒ de jiàn ne|where is my sword / ？ / 怎么找不到|zěn me zhǎo bu dào|why can I not find it / ？ / ” / 老人说|lǎo rén shuō|the old man said / ： / “ / 你看看|nǐ kàn kan|take a look / 对面的树|duì mian de shù|at the tree opposite / 。 / 剑掉下去时|jiàn diào xià qù shí|when the sword fell / ， / 船在树旁边|chuán zài shù páng biān|the boat was beside the tree / 。 / 现在|xiàn zài|now / 船在这里|chuán zài zhè lǐ|the boat is here / 。 / 船走了|chuán zǒu le|the boat moved / ， / 剑没有|jiàn méi yǒu|the sword did not / 跟着船走|gēn zhe chuán zǒu|move with the boat / 。 / ” / 那个人|nà ge rén|the man / 看着远处|kàn zhe yuǎn chù|looked into the distance / ， / 不说话了|bù shuō huà le|and fell silent / 。`),
    quiz('contrast', 'choice', '船走了，剑没走', 'Why is looking below the mark now unlikely to work?', [
      ['changed', '船的位置变了|chuán de wèi zhi biàn le|the boat has changed position'], ['gone', '记号不见了|jì hao bú jiàn le|the mark has disappeared'], ['tree', '树跟着船走了|shù gēn zhe chuán zǒu le|the tree has moved with the boat'],
    ], ['changed'], 'Compare the boat’s location when the sword fell with its location now.', 'The mark is still visible, but it is above a different part of the river.'),
    quiz('tree-clue', 'choice', '对面的树', 'Why does the old man point out the tree?', [
      ['climb', '让他爬树|ràng tā pá shù|to have him climb the tree'], ['reference', '帮助他|bāng zhù tā|to help him / 想起落水的地方|xiǎng qǐ luò shuǐ de dì fang|recall where the sword fell'], ['carve', '让他再刻记号|ràng tā zài kè jì hao|to have him carve another mark'],
    ], ['reference'], 'The boat was beside that tree when the accident happened.', 'A landmark on the bank helps compare river locations independently of the moving boat.'),
    quiz('events', 'order', '先掉剑，再做记号', 'Put the events in order to explain the failed search.', [
      ['arrive', '船到了对岸|chuán dào le duì àn|the boat reaches the opposite bank'], ['mark', '他在船上|tā zài chuán shang|on the boat he / 做记号|zuò jì hao|makes a mark'], ['search', '他从记号下面|tā cóng jì hao xià mian|below the mark he / 找剑|zhǎo jiàn|looks for the sword'], ['fall', '剑掉进水里|jiàn diào jìn shuǐ lǐ|the sword falls into the water'],
    ], ['fall', 'mark', 'arrive', 'search'], 'The sword falls first; the boat moves before he searches.', 'The delay matters because the mark travels between the accident and the search.'),

    read('new-plan', '第五幕 · 换个办法', `那个人问|nà ge rén wèn|the man asked / ： / “ / 我只看记号|wǒ zhǐ kàn jì hao|I only looked at the mark / ， / 没有想|méi yǒu xiǎng|and did not think / 船会走|chuán huì zǒu|that the boat would move / 。 / 这个办法|zhè ge bàn fǎ|this method / 不对|bú duì|is wrong / ， / 现在|xiàn zài|now / 怎么找剑呢|zěn me zhǎo jiàn ne|how can we look for the sword / ？ / ” / 老人说|lǎo rén shuō|the old man said / ： / “ / 先想一想|xiān xiǎng yi xiǎng|first think it over / ， / 剑在哪里|jiàn zài nǎ lǐ|where is the sword / 掉下去的|diào xià qù de|where it fell / 。 / 我们可以|wǒ men kě yǐ|we can / 回到树旁边|huí dào shù páng biān|return to beside the tree / ， / 请熟悉这里|qǐng shú xi zhè lǐ|ask someone familiar with here / 的人|de rén|a person / 帮忙找|bāng máng zhǎo|to help search / 。 / 但是|dàn shì|but / 水很深|shuǐ hěn shēn|the water is deep / ， / 不要自己下水|bú yào zì jǐ xià shuǐ|do not enter the water yourself / 。 / ” / 那个人说|nà ge rén shuō|the man said / ： / “ / 好|hǎo|all right / ， / 找剑|zhǎo jiàn|looking for the sword / 要看地方|yào kàn dì fang|requires checking the location / ， / 不能只看|bù néng zhǐ kàn|I cannot only look at / 船上的记号|chuán shang de jì hao|the mark on the boat / 。 / ”`),
    quiz('new-method', 'choice', '办法', 'What makes the new 办法 more useful?', [
      ['bigger', '把记号|bǎ jì hao|the mark / 刻得更大|kè de gèng dà|is carved bigger'], ['place', '回到|huí dào|returning to / 剑落水的地方|jiàn luò shuǐ de dì fang|where the sword fell'], ['wait', '在对岸等|zài duì àn děng|waiting at the opposite bank'],
    ], ['place'], 'The plan uses the tree to recall the accident location.', 'The new search follows evidence about the sword’s location instead of the mark’s current location.'),
    quiz('help', 'choice', '请人帮忙找', 'What does the old man recommend about searching the deep water?', [
      ['alone', '自己马上下水|zì jǐ mǎ shàng xià shuǐ|enter the water alone immediately'], ['help', '请熟悉这里的人|qǐng shú xi zhè lǐ de rén|ask someone who knows the area / 帮忙找|bāng máng zhǎo|to help search'], ['ignore', '不看水深不深|bú kàn shuǐ shēn bu shēn|ignore whether the water is deep'],
    ], ['help'], 'He says the water is deep and warns the man against going in himself.', 'Correcting the location is only part of a good plan. The search also needs appropriate help.'),
    quiz('next-location', 'prediction', '先想一想', 'Where should they go next if they follow the new plan?', [
      ['tree', '回到树旁边|huí dào shù páng biān|back beside the tree'], ['home', '去他家里|qù tā jiā lǐ|to his home'], ['mark', '一直跟着记号|yì zhí gēn zhe jì hao|keep following the mark'],
    ], ['tree'], 'The tree helps identify where the boat was when the sword fell.', 'They should first return toward the original location. That improves the search without guaranteeing success.'),

    read('lesson', '第六幕 · 记号没有错吗？', `他们回到|tā men huí dào|they returned to / 树旁边|shù páng biān|beside the tree / ， / 找人帮忙|zhǎo rén bāng máng|and found someone to help / 。 / 那天|nà tiān|that day / 能不能找到剑|néng bu néng zhǎo dào jiàn|whether they could find the sword / ， / 还不知道|hái bù zhī dào|was still unknown / 。 / 那个人|nà ge rén|the man / 看着船|kàn zhe chuán|looked at the boat / 说|shuō|and said / ： / “ / 记号还在|jì hao hái zài|the mark is still there / ， / 但地方变了|dàn dì fang biàn le|but the location has changed / 。 / 我说|wǒ shuō|I said / 记号不会跑|jì hao bú huì pǎo|the mark could not run away / ， / 却忘了|què wàng le|but forgot / 船会走|chuán huì zǒu|the boat would move / 。 / ” / 老人问|lǎo rén wèn|the old man asked / ： / “ / 以后|yǐ hòu|in the future / 还做记号吗|hái zuò jì hao ma|will you still make marks / ？ / ” / 他回答|tā huí dá|he answered / ： / “ / 可以做记号|kě yǐ zuò jì hao|I can make marks / ， / 但要先想|dàn yào xiān xiǎng|but first I must think / 记在哪里|jì zài nǎ lǐ|where to put them / 。 / 用一个办法|yòng yí ge bàn fǎ|when using a method / ， / 也要看看|yě yào kàn kan|I must also check / 现在的地方|xiàn zài de dì fang|the current location / 和以前|hé yǐ qián|and before / 一不一样|yí bu yí yàng|whether they are the same / 。 / ”`),
    quiz('outcome', 'choice', '还不知道', 'Does this ending say they definitely recover the sword?', [
      ['yes', '已经找到了|yǐ jīng zhǎo dào le|they have already found it'], ['unknown', '还不知道|hái bù zhī dào|it is still unknown'], ['never', '永远找不到|yǒng yuǎn zhǎo bu dào|they can never find it'],
    ], ['unknown'], 'The paragraph separates a better search plan from its result.', 'A better method improves the search, but the story does not claim a guaranteed recovery.'),
    quiz('meaning', 'choice', '记在哪里', 'What has the man learned about making marks?', [
      ['never', '所有记号|suǒ yǒu jì hao|all marks / 都没用|dōu méi yòng|are useless'], ['where', '要想清楚|yào xiǎng qīng chu|one must think carefully / 记号做在哪里|jì hao zuò zài nǎ lǐ|about where the mark is made'], ['large', '只要记号大|zhǐ yào jì hao dà|as long as the mark is big / 就有用|jiù yǒu yòng|it will be useful'],
    ], ['where'], 'He says 可以做记号, then adds a condition.', 'Marks can help when their position matches what you need to remember. The problem was his use of a moving reference.'),
    quiz('transfer', 'prediction', '地方变了', 'Later, he leaves a bag beside a cart. The cart moves away. What would show he learned the lesson?', [
      ['cart', '只在车旁边找|zhǐ zài chē páng biān zhǎo|only search beside the cart'], ['original', '回到原来|huí dào yuán lái|return to the original / 放包的地方找|fàng bāo de dì fang zhǎo|place where he left the bag to search'], ['mark', '在车上|zài chē shang|on the cart / 再做记号|zài zuò jì hao|make another mark'],
    ], ['original'], 'The bag, like the sword, did not travel with the moving object.', 'He should track where the bag was left. A method must fit the current situation rather than repeat the same mistaken assumption.'),
  ],
}
