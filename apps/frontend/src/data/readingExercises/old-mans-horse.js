// An expanded learner adaptation of 塞翁失马 from 淮南子·人间训.
// Each line is a paragraph or a complete dialogue turn, rather than one sentence.
const words = value => value.split(' / ').map(segment => {
  const [text, pinyin, meaning] = segment.split('|')
  return { text, pinyin, meaning }
})
const line = (id, speaker, value) => ({ id, speaker, words: words(value) })
const option = (id, value) => ({ id, words: words(value) })

export const story = {
  id: 'old-mans-horse-v1',
  title: '塞翁失马',
  pinyin: 'Sàiwēng shī mǎ',
  translation: 'The old man who lost his horse',
  tagline: 'A CHINESE CLASSIC · FORTUNE AND UNCERTAINTY',
  characters: {
    father: { name: '塞翁 · The old man', avatar: '翁' },
    son: { name: '儿子 · His son', avatar: '子' },
    neighbor: { name: '邻居 · The neighbor', avatar: '邻' },
  },
  steps: [
    { id: 'border-village', type: 'read', title: '第一幕 · 一匹马不见了', lines: [
      line('village', null, `很久以前，边塞附近住着一位老人，大家叫他塞翁。他和儿子相依为命，种一点地，也养几匹马。村里的人遇到难题，常常来找他商量。|Hěn jiǔ yǐqián, biānsài fùjìn zhùzhe yí wèi lǎorén, dàjiā jiào tā Sàiwēng. Tā hé érzi xiāngyīwéimìng, zhòng yì diǎn dì, yě yǎng jǐ pǐ mǎ. Cūn lǐ de rén yùdào nántí, chángcháng lái zhǎo tā shāngliang.|Long ago, an old man lived near the frontier. He and his son depended on each other, farming and keeping horses. Villagers often sought his advice.`),
      line('missing', 'son', `爹，马棚的门开着！那匹白马不见了。我沿着河边找了半天，只看见地上的脚印。脚印一直通向北边，恐怕它已经跑到关外去了。|Diē, mǎpéng de mén kāizhe! Nà pǐ báimǎ bú jiàn le. Wǒ yánzhe hébiān zhǎo le bàntiān, zhǐ kànjiàn dìshang de jiǎoyìn. Jiǎoyìn yìzhí tōngxiàng běibian, kǒngpà tā yǐjīng pǎo dào guānwài qù le.|Father, the stable door is open! The white horse is gone. I searched along the river for ages. Its tracks lead north, probably beyond the border.`),
      line('search', 'father', `先喝口水，慢慢说。我们再去附近找找，问问路上的人。找得到，就把它带回来；找不到，也不能让你一个人走到危险的地方。马很重要，你更重要。|Xiān hē kǒu shuǐ, mànmàn shuō. Wǒmen zài qù fùjìn zhǎozhao, wènwen lùshang de rén. Zhǎo de dào, jiù bǎ tā dài huílai; zhǎo bú dào, yě bù néng ràng nǐ yí ge rén zǒu dào wēixiǎn de dìfang. Mǎ hěn zhòngyào, nǐ gèng zhòngyào.|Have some water first. We will search nearby and ask travelers. We will bring it back if we can, but you must not go somewhere dangerous alone. The horse matters; you matter more.`),
    ] },
    { id: 'search-purpose', type: 'choice', label: 'Care before certainty',
      'target-phrase': '马很重要，你更重要',
      prompt: 'What does the father’s response show about him?',
      options: [option('care', '他想找马，也关心儿子的安全。|Tā xiǎng zhǎo mǎ, yě guānxīn érzi de ānquán.'), option('ignore', '他觉得马不重要，不愿意去找。|Tā juéde mǎ bù zhòngyào, bú yuànyì qù zhǎo.'), option('blame', '他只想责怪儿子。|Tā zhǐ xiǎng zéguài érzi.')],
      answer: ['care'], hint: 'He suggests searching, but sets a limit on where his son should go.',
      explanation: 'His calmness includes practical action and care. He does not confuse accepting uncertainty with doing nothing.' },
    { id: 'neighbors-visit', type: 'read', title: '第二幕 · 真的是坏事吗？', lines: [
      line('unsuccessful', null, `父子俩找了几天，始终没有找到白马。邻居听说了，带着一篮鸡蛋来安慰他们。院子里空了一个马位，儿子每次经过，都忍不住往里面看。|Fùzǐ liǎ zhǎo le jǐ tiān, shǐzhōng méiyǒu zhǎodào báimǎ. Línjū tīngshuō le, dàizhe yì lán jīdàn lái ānwèi tāmen. Yuànzi lǐ kōng le yí ge mǎwèi, érzi měi cì jīngguò, dōu rěn bu zhù wǎng lǐmian kàn.|They searched for days without success. A neighbor brought eggs to comfort them. Whenever the son passed the empty stall, he could not help looking inside.`),
      line('comfort', 'neighbor', `这么好的马，说丢就丢了，真可惜！你们养了它好几年，一定很难过。往后拉车、运粮食，少了一匹马，日子也会辛苦一些。|Zhème hǎo de mǎ, shuō diū jiù diū le, zhēn kěxī! Nǐmen yǎng le tā hǎo jǐ nián, yídìng hěn nánguò. Wǎnghòu lā chē, yùn liángshi, shǎo le yì pǐ mǎ, rìzi yě huì xīnkǔ yìxiē.|What a shame to lose such a fine horse! You must feel sad after keeping it for years. Pulling carts and carrying grain will be harder with one fewer horse.`),
      line('uncertainty', 'father', `谢谢你的好意。丢了马，我当然也难过。不过，现在就说这一定是坏事，也许还太早。后面会发生什么，谁能完全知道呢？我们先把眼前的日子过好吧。|Xièxie nǐ de hǎoyì. Diū le mǎ, wǒ dāngrán yě nánguò. Búguò, xiànzài jiù shuō zhè yídìng shì huàishì, yěxǔ hái tài zǎo. Hòumian huì fāshēng shénme, shéi néng wánquán zhīdào ne? Wǒmen xiān bǎ yǎnqián de rìzi guò hǎo ba.|Thank you for your kindness. Of course I am sad too. But it may be too early to call this certainly bad. Who knows everything that will follow? Let us take care of life as it is now.`),
    ] },
    { id: 'comfort-word', type: 'word', label: 'Kindness in context',
      'target-phrase': '安慰', prompt: 'Which word describes what the neighbor is trying to do by visiting with eggs?',
      options: [option('comfort', '安慰|ānwèi'), option('celebrate', '祝贺|zhùhè'), option('blame', '责怪|zéguài'), option('hide', '隐瞒|yǐnmán')],
      answer: ['comfort'], hint: 'He acknowledges the family’s sadness and brings a gift.',
      explanation: '安慰 means to comfort. The neighbor’s first judgment may be incomplete, but his concern for the family is sincere.' },
    { id: 'returning-horses', type: 'read', title: '第三幕 · 白马回来了', lines: [
      line('return', null, `过了几个月，一天清晨，院外忽然传来马叫声。儿子推开门，发现白马回来了，身后还跟着一匹高大的黑马。两匹马低着头，在门口安静地吃草。|Guò le jǐ ge yuè, yì tiān qīngchén, yuàn wài hūrán chuánlái mǎjiàoshēng. Érzi tuīkāi mén, fāxiàn báimǎ huílai le, shēnhòu hái gēnzhe yì pǐ gāodà de hēimǎ. Liǎng pǐ mǎ dīzhe tóu, zài ménkǒu ānjìng de chī cǎo.|Months later, the son heard horses outside at dawn. The white horse had returned with a tall black horse. Both stood quietly grazing by the gate.`),
      line('celebration', 'neighbor', `恭喜，恭喜！上次我还说你倒霉，没想到白马带回了这么好的伙伴。现在你多了一匹马，真是天大的好事！看来，你早就知道它会回来吧？|Gōngxǐ, gōngxǐ! Shàng cì wǒ hái shuō nǐ dǎoméi, méi xiǎngdào báimǎ dài huí le zhème hǎo de huǒbàn. Xiànzài nǐ duō le yì pǐ mǎ, zhēn shì tiān dà de hǎoshì! Kànlái, nǐ zǎo jiù zhīdào tā huì huílai ba?|Congratulations! I thought you were unlucky, but the white horse brought a fine companion. What wonderful luck! You must have known it would come back!`),
      line('not-prophecy', 'father', `我可不知道。我只是说，事情还没有结束，不必急着下结论。多了一匹马，当然值得高兴，可是马的性子怎么样，我们还不清楚。先照顾好它，再慢慢了解吧。|Wǒ kě bù zhīdào. Wǒ zhǐshì shuō, shìqing hái méiyǒu jiéshù, bú bì jízhe xià jiélùn. Duō le yì pǐ mǎ, dāngrán zhíde gāoxìng, kěshì mǎ de xìngzi zěnmeyàng, wǒmen hái bù qīngchu. Xiān zhàogù hǎo tā, zài mànmàn liǎojiě ba.|I did not know. I only meant the story was not over, so we need not rush to a conclusion. Another horse is a joy, but we do not know its temperament. Let us care for it and learn.`),
    ] },
    { id: 'judgment-blanks', type: 'blanks', label: 'Complete the old man’s reasoning',
      'target-phrase': '不必急着下结论', prompt: 'Rebuild the distinction between uncertainty and prediction.',
      before: words('我不是说我能|Wǒ bú shì shuō wǒ néng'), between: words('未来，只是说不必急着下|wèilái, zhǐshì shuō bú bì jízhe xià'), after: words('。'),
      options: [option('conclusion', '结论|jiélùn'), option('forget', '忘记|wàngjì'), option('predict', '预知|yùzhī'), option('gift', '礼物|lǐwù')], answer: ['predict', 'conclusion'],
      hint: 'The first blank means knowing the future; the second means a judgment reached from evidence.',
      explanation: '“I am not saying I can predict the future, only that we need not rush to a conclusion.” His wisdom is admitting what he does not know.' },
    { id: 'sons-enthusiasm', type: 'read', title: '第四幕 · 年轻人的心', lines: [
      line('ambition', 'son', `爹，你看它跑得多快！等我学会骑它，就能更快地送粮食，也能带你去远一点的集市。别人都说这是难得的好马，我想今天就试一试。|Diē, nǐ kàn tā pǎo de duō kuài! Děng wǒ xuéhuì qí tā, jiù néng gèng kuài de sòng liángshi, yě néng dài nǐ qù yuǎn yì diǎn de jíshì. Biéren dōu shuō zhè shì nándé de hǎo mǎ, wǒ xiǎng jīntiān jiù shì yi shì.|Father, look how fast it runs! If I learn to ride it, I can deliver grain faster and take you to distant markets. Everyone says it is a rare fine horse. I want to try today.`),
      line('warning', 'father', `想学骑马是好事，可别只看到它跑得快。你还不熟悉它，它也不熟悉你。先牵着它走几圈，等它习惯你的声音，再请有经验的人陪你练习。|Xiǎng xué qímǎ shì hǎoshì, kě bié zhǐ kàndào tā pǎo de kuài. Nǐ hái bù shúxī tā, tā yě bù shúxī nǐ. Xiān qiānzhe tā zǒu jǐ quān, děng tā xíguàn nǐ de shēngyīn, zài qǐng yǒu jīngyàn de rén péi nǐ liànxí.|Learning to ride is good, but speed is not everything. You do not know each other yet. Lead it around first, let it learn your voice, then practice with someone experienced.`),
      line('impatience', null, `儿子点点头，心里却有些着急。第二天下午，他看见黑马在院子里慢慢走，觉得它已经很温顺了。他没有等父亲回来，就拿起马鞍，悄悄打开了院门。|Érzi diǎndiǎn tóu, xīnli què yǒuxiē zháojí. Dì èr tiān xiàwǔ, tā kànjiàn hēimǎ zài yuànzi lǐ mànmàn zǒu, juéde tā yǐjīng hěn wēnshùn le. Tā méiyǒu děng fùqin huílai, jiù náqǐ mǎ'ān, qiāoqiāo dǎkāi le yuànmén.|The son agreed, but felt impatient. The next afternoon, the horse seemed gentle as it walked in the yard. Without waiting for his father, he picked up the saddle and quietly opened the gate.`),
    ] },
    { id: 'riding-prediction', type: 'prediction', label: 'Read the warning signs',
      'target-phrase': '不能只看眼前', prompt: 'Which prediction best follows the clues, without pretending to know the future?',
      options: [option('risk', '他还不了解黑马，独自骑马可能有危险。|Tā hái bù liǎojiě hēimǎ, dúzì qímǎ kěnéng yǒu wēixiǎn.'), option('certain', '黑马走得很慢，所以绝对不会出事。|Hēimǎ zǒu de hěn màn, suǒyǐ juéduì bú huì chūshì.'), option('magic', '白马会告诉他明天的事情。|Báimǎ huì gàosu tā míngtiān de shìqing.')], answer: ['risk'],
      hint: 'A calm moment does not establish how an unfamiliar horse will behave under a rider.',
      explanation: 'The clues support a possibility of danger, not certainty about an accident. Recognizing uncertainty can help us act more carefully.' },
    { id: 'accident', type: 'read', title: '第五幕 · 一次意外', lines: [
      line('fall', null, `开始时，黑马走得很稳，儿子高兴地笑了。到了村口，一只野兔突然从草丛里跳出来。黑马受了惊，猛地向前冲去。儿子来不及抓紧缰绳，从马背上摔了下来。|Kāishǐ shí, hēimǎ zǒu de hěn wěn, érzi gāoxìng de xiào le. Dào le cūnkǒu, yì zhī yětù tūrán cóng cǎocóng lǐ tiào chūlai. Hēimǎ shòu le jīng, měng de xiàng qián chōng qù. Érzi lái bu jí zhuājǐn jiāngshéng, cóng mǎbèi shàng shuāi le xiàlai.|At first the horse walked steadily. Then a rabbit sprang from the grass. The startled horse surged forward, and the son fell before he could grip the reins.`),
      line('pain', 'son', `爹，我的腿疼得厉害，站不起来。我没有听你的话，还以为自己什么都会。是不是因为我太着急，才把好事变成了坏事？以后我还能走路吗？|Diē, wǒ de tuǐ téng de lìhai, zhàn bu qǐlái. Wǒ méiyǒu tīng nǐ de huà, hái yǐwéi zìjǐ shénme dōu huì. Shì bú shì yīnwèi wǒ tài zháojí, cái bǎ hǎoshì biànchéng le huàishì? Yǐhòu wǒ hái néng zǒulù ma?|Father, my leg hurts terribly. I cannot stand. I ignored you and thought I knew everything. Did my impatience turn good fortune into bad? Will I walk again?`),
      line('treatment', 'father', `先别动，我们已经请人去找大夫了。现在最要紧的是治伤，不是责怪谁。你愿意承认自己的错误，以后就能更小心。至于多久能走路，要听大夫的，不能靠我猜。|Xiān bié dòng, wǒmen yǐjīng qǐng rén qù zhǎo dàifu le. Xiànzài zuì yàojǐn de shì zhì shāng, bú shì zéguài shéi. Nǐ yuànyì chéngrèn zìjǐ de cuòwù, yǐhòu jiù néng gèng xiǎoxīn. Zhìyú duō jiǔ néng zǒulù, yào tīng dàifu de, bù néng kào wǒ cāi.|Stay still; someone has gone for the doctor. Treatment matters most, not blame. Admitting a mistake can help you be more careful. The doctor must advise us about recovery; I cannot guess.`),
    ] },
    { id: 'immediate-response', type: 'choice', label: 'What matters now?',
      'target-phrase': '现在最要紧的是治伤', prompt: 'Which action best expresses the father’s outlook after the accident?',
      options: [option('wait', '既然不知道未来，就什么也不做。|Jìrán bù zhīdào wèilái, jiù shénme yě bú zuò.'), option('help', '先请大夫治伤，再慢慢恢复。|Xiān qǐng dàifu zhì shāng, zài mànmàn huīfù.'), option('celebrate', '马上庆祝，因为受伤一定是好事。|Mǎshàng qìngzhù, yīnwèi shòushāng yídìng shì hǎoshì.')], answer: ['help'],
      hint: 'The father does not know the long-term outcome, but he knows his son needs care.',
      explanation: 'Uncertainty about the future does not erase present pain or responsibility. He acts on what is clear: his son needs treatment.' },
    { id: 'slow-recovery', type: 'read', title: '第六幕 · 再一次探望', lines: [
      line('recovery', null, `大夫给儿子包扎了伤腿，让他安心休养。接下来的日子里，父亲煮饭、换药，邻居帮忙运粮食。黑马仍然住在马棚里，儿子拄着拐杖，有时也去给它添草。|Dàifu gěi érzi bāozā le shāngtuǐ, ràng tā ānxīn xiūyǎng. Jiē xiàlai de rìzi lǐ, fùqin zhǔ fàn, huàn yào, línjū bāngmáng yùn liángshi. Hēimǎ réngrán zhù zài mǎpéng lǐ, érzi zhǔzhe guǎizhàng, yǒushí yě qù gěi tā tiān cǎo.|The doctor bandaged the leg and prescribed rest. His father cooked and changed dressings; neighbors carried grain. Sometimes the son, using a crutch, still brought grass to the horse.`),
      line('bad-again', 'neighbor', `本来多了一匹好马，谁想到孩子会摔伤呢！早知道这样，还不如白马没有回来。你上次说别急着下结论，可这一次，总该承认是坏事了吧？|Běnlái duō le yì pǐ hǎo mǎ, shéi xiǎngdào háizi huì shuāishāng ne! Zǎo zhīdào zhèyàng, hái bùrú báimǎ méiyǒu huílai. Nǐ shàng cì shuō bié jízhe xià jiélùn, kě zhè yí cì, zǒng gāi chéngrèn shì huàishì le ba?|Who imagined the extra horse would lead to an injury? Perhaps it would have been better if the white horse had never returned. Surely this time you must call it bad!`),
      line('not-denial', 'father', `孩子受苦，我怎么会不心疼？我不会说受伤值得庆祝。我只是觉得，一件事带来的影响，往往不止我们眼前看见的这些。先照顾好他，别的事以后再说。|Háizi shòukǔ, wǒ zěnme huì bù xīnténg? Wǒ bú huì shuō shòushāng zhíde qìngzhù. Wǒ zhǐshì juéde, yí jiàn shì dàilái de yǐngxiǎng, wǎngwǎng bù zhǐ wǒmen yǎnqián kànjiàn de zhèxiē. Xiān zhàogù hǎo tā, bié de shì yǐhòu zài shuō.|Of course his suffering hurts me. An injury is no cause for celebration. I only mean that an event’s effects often extend beyond what we can see now. Let us care for him first.`),
    ] },
    { id: 'border-war', type: 'read', title: '第七幕 · 边关传来的消息', lines: [
      line('war', null, `一年以后，边关发生了战事。村里的年轻人接到征召，必须离开家去打仗。送行那天，村口站满了人，有人替孩子整理衣服，有人拉着亲人的手，久久不肯放开。|Yì nián yǐhòu, biānguān fāshēng le zhànshì. Cūn lǐ de niánqīngrén jiēdào zhēngzhào, bìxū líkāi jiā qù dǎzhàng. Sòngxíng nà tiān, cūnkǒu zhànmǎn le rén, yǒu rén tì háizi zhěnglǐ yīfu, yǒu rén lāzhe qīnrén de shǒu, jiǔjiǔ bù kěn fàngkāi.|A year later war broke out at the frontier. The village’s young men were called to fight. At their departure, families straightened clothes and held loved ones’ hands, reluctant to let go.`),
      line('exemption', null, `塞翁的儿子因为腿伤还没有完全好，不能骑马行军，留在了家里。后来，战场上传来坏消息，许多出征的人再也没有回来。村子里的灯，仿佛一夜之间暗了许多。|Sàiwēng de érzi yīnwèi tuǐshāng hái méiyǒu wánquán hǎo, bù néng qímǎ xíngjūn, liú zài le jiā lǐ. Hòulái, zhànchǎng shàng chuánlái huài xiāoxi, xǔduō chūzhēng de rén zài yě méiyǒu huílai. Cūnzi lǐ de dēng, fǎngfú yí yè zhī jiān àn le xǔduō.|The son’s leg had not fully healed, so he could not ride with the army and stayed home. Later came news that many who had left would never return. The village seemed dimmer overnight.`),
      line('survivor', 'son', `爹，要是我的腿没有受伤，我也可能去了战场。我庆幸自己还在你身边，可是想到那些没有回来的人，心里很难过。我不知道该说自己幸运，还是该说这一切太无常。|Diē, yàoshi wǒ de tuǐ méiyǒu shòushāng, wǒ yě kěnéng qù le zhànchǎng. Wǒ qìngxìng zìjǐ hái zài nǐ shēnbiān, kěshì xiǎngdào nàxiē méiyǒu huílai de rén, xīnli hěn nánguò. Wǒ bù zhīdào gāi shuō zìjǐ xìngyùn, háishi gāi shuō zhè yíqiè tài wúcháng.|Without the injury I might have gone too. I am grateful to be beside you, but sad for those who did not return. I do not know whether to call myself lucky or life unpredictable.`),
    ] },
    { id: 'mixed-feelings', type: 'choice', label: 'Two feelings can coexist',
      'target-phrase': '庆幸，也难过', prompt: 'Why does the son feel both relief and sadness?',
      options: [option('mixed', '他保住了性命，却失去了许多乡亲。|Tā bǎozhù le xìngmìng, què shīqù le xǔduō xiāngqīn.'), option('horse', '他只关心黑马跑得快不快。|Tā zhǐ guānxīn hēimǎ pǎo de kuài bu kuài.'), option('certain', '他终于证明受伤永远是好事。|Tā zhōngyú zhèngmíng shòushāng yǒngyuǎn shì hǎoshì.')], answer: ['mixed'],
      hint: 'His survival and the other families’ loss are both real.',
      explanation: 'An unexpected benefit does not erase suffering. The story’s reversal calls for humility and compassion, rather than celebrating other people’s misfortune.' },
    { id: 'understanding', type: 'read', title: '第八幕 · 不急着给生活下结论', lines: [
      line('compassion', 'father', `能平安活着，值得珍惜；别人失去亲人，也值得我们记在心里。明天我们把家里的粮食分出一些，送给需要的人。知道祸福难料，不是让我们只顾自己。|Néng píng'ān huózhe, zhíde zhēnxī; biéren shīqù qīnrén, yě zhíde wǒmen jì zài xīnli. Míngtiān wǒmen bǎ jiā lǐ de liángshi fēn chū yìxiē, sòng gěi xūyào de rén. Zhīdào huòfú nánliào, bú shì ràng wǒmen zhǐ gù zìjǐ.|Life and safety are precious; we must also remember others’ losses. Tomorrow let us share grain with those in need. Uncertain fortune is no reason to care only about ourselves.`),
      line('lesson', 'son', `我明白了一点。遇到好事，不必得意忘形；遇到坏事，也别马上绝望。该找马的时候找马，该治伤的时候治伤。我们不能决定所有结果，却可以认真做好眼前的事。|Wǒ míngbai le yì diǎn. Yùdào hǎoshì, bú bì déyìwàngxíng; yùdào huàishì, yě bié mǎshàng juéwàng. Gāi zhǎo mǎ de shíhou zhǎo mǎ, gāi zhì shāng de shíhou zhì shāng. Wǒmen bù néng juédìng suǒyǒu jiéguǒ, què kěyǐ rènzhēn zuò hǎo yǎnqián de shì.|I understand a little. Good fortune need not make us arrogant; bad fortune need not bring instant despair. Search when a horse is lost; treat an injury when it happens. We cannot control every outcome, but we can act carefully now.`),
      line('closing', null, `后来，人们把这个故事叫作“塞翁失马”，也常说“塞翁失马，焉知非福”。它提醒人们，祸与福有时会互相转化。故事没有教人等待奇迹，而是请人少一点武断，多一点耐心，也多一点对他人的体谅。|Hòulái, rénmen bǎ zhège gùshi jiàozuò “Sàiwēng shī mǎ”, yě cháng shuō “Sàiwēng shī mǎ, yān zhī fēi fú”. Tā tíxǐng rénmen, huò yǔ fú yǒushí huì hùxiāng zhuǎnhuà. Gùshi méiyǒu jiāo rén děngdài qíjì, ér shì qǐng rén shǎo yì diǎn wǔduàn, duō yì diǎn nàixīn, yě duō yì diǎn duì tārén de tǐliàng.|The tale became known as “The Old Man Who Lost His Horse”: who can know it will not bring a blessing? Fortune and misfortune may transform. This adaptation invites patience, less hasty judgment, and consideration for others, rather than waiting for miracles.`),
    ] },
    { id: 'story-sequence', type: 'order', label: 'Trace the reversals',
      'target-phrase': '祸福难料', prompt: 'Put the turning points in order. Notice how each changes the meaning of the previous event.',
      options: [option('injury', '儿子骑黑马，摔伤了腿。|Érzi qí hēimǎ, shuāishāng le tuǐ.'), option('spared', '儿子因为腿伤，没有出征。|Érzi yīnwèi tuǐshāng, méiyǒu chūzhēng.'), option('lost', '白马跑到关外去了。|Báimǎ pǎo dào guānwài qù le.'), option('return', '白马带着黑马回来了。|Báimǎ dàizhe hēimǎ huílai le.')],
      answer: ['lost', 'return', 'injury', 'spared'], hint: 'The loss comes first; the new horse makes the accident possible; the injury later keeps the son at home.',
      explanation: 'Loss leads to an apparent gain, gain to injury, and injury to an unexpected escape from war. None of these consequences was obvious at the beginning.' },
    { id: 'meaning-prediction', type: 'prediction', label: 'Carry the meaning forward',
      'target-phrase': '认真做好眼前的事', prompt: 'If a new difficulty arrives tomorrow, which response would best fit what the son has learned?',
      options: [option('guarantee', '不用努力，坏事一定会自动变好。|Bú yòng nǔlì, huàishì yídìng huì zìdòng biàn hǎo.'), option('careful', '先想办法应对，也给未来留一点余地。|Xiān xiǎng bànfǎ yìngduì, yě gěi wèilái liú yì diǎn yúdì.'), option('judge', '立刻判断谁幸运，谁倒霉。|Lìkè pànduàn shéi xìngyùn, shéi dǎoméi.')], answer: ['careful'],
      hint: 'He has learned both to act in the present and to leave room for uncertainty.',
      explanation: 'The lesson is a way of responding: take useful action, care for people, and remain open to consequences you cannot yet see. It is not a promise that every loss will be rewarded.' },
  ],
}
