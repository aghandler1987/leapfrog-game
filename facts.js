// Frog facts for Leap Frog.
// Each fact: { text, isTrue, explanation }
// To swap in an LLM source later, replace getFactQueue() with an async fetch.

const FROG_FACTS = [
  // ========== Biology & anatomy ==========
  { text: "Frogs absorb water through their skin instead of drinking it.", isTrue: true, explanation: "Frogs have a 'drinking patch' on their belly that soaks up water directly through the skin." },
  { text: "Frogs have teeth on their lower jaw.", isTrue: false, explanation: "Most frogs only have tiny teeth on their upper jaw, used to grip prey — not chew it." },
  { text: "Frogs close their eyes to help them swallow food.", isTrue: true, explanation: "Their eyeballs push down through the skull to help shove food down their throat." },
  { text: "Frogs can breathe through their skin.", isTrue: true, explanation: "Frogs absorb oxygen through their moist skin, which is why they must stay damp." },
  { text: "A frog's tongue is attached to the back of its mouth.", isTrue: false, explanation: "A frog's tongue is attached at the FRONT of its mouth, which is why it can flip out so fast and far." },
  { text: "Frogs shed their skin and then eat it.", isTrue: true, explanation: "Frogs shed their skin regularly — often weekly — and usually eat it to reclaim the nutrients." },
  { text: "Frogs' hearts have four chambers, like humans.", isTrue: false, explanation: "Frog hearts have three chambers: two atria and one ventricle." },
  { text: "Frog bones form a new ring every year, like trees.", isTrue: true, explanation: "Scientists can estimate a frog's age by counting growth rings in its bones." },
  { text: "Frogs sleep with their eyes open.", isTrue: true, explanation: "Frogs don't have true eyelids like ours — they rest with their eyes partially open." },
  { text: "Frogs have three eyelids.", isTrue: true, explanation: "They have upper and lower eyelids plus a transparent nictitating membrane that protects the eye underwater." },
  { text: "A frog's tongue can be launched in under a tenth of a second.", isTrue: true, explanation: "High-speed cameras show frogs can hit prey in about 0.07 seconds — faster than you can blink." },
  { text: "A frog's saliva becomes thin and watery when its tongue hits prey.", isTrue: true, explanation: "The impact liquefies the saliva so it coats the prey, then it thickens again to haul it back." },
  { text: "Frogs have external ears like mammals do.", isTrue: false, explanation: "Frogs lack external ears; they hear via a tympanum — a visible disc of skin on each side of their head." },
  { text: "Frogs don't have ribs.", isTrue: true, explanation: "Most frog species have no ribs, which is one reason they can't cough." },
  { text: "Frogs have belly buttons.", isTrue: false, explanation: "Frogs hatch from eggs, not placentas, so they have no umbilical cord and no belly button." },
  { text: "A frog's skeleton has fewer vertebrae than most mammals.", isTrue: true, explanation: "Most frogs have just 9 or 10 vertebrae; humans have 33." },
  { text: "A frog's eyes can see in nearly every direction at once.", isTrue: true, explanation: "Their bulging eyes give them a field of view close to 360 degrees." },
  { text: "A frog's heart beats faster when it's cold.", isTrue: false, explanation: "Frogs are ectothermic — cold slows their metabolism and their heart rate drops dramatically." },
  { text: "A frog's lungs are its primary way of getting oxygen.", isTrue: false, explanation: "For most frogs, more oxygen is absorbed through the skin than through the lungs." },
  { text: "Frogs have a single bone for their lower leg.", isTrue: true, explanation: "The tibia and fibula are fused into one bone called the tibiofibula — great for jumping." },
  { text: "Frogs can see color better than most mammals.", isTrue: true, explanation: "Frogs have four types of color-sensing cones; most mammals only have two." },
  { text: "Frogs can see in color even in near-total darkness.", isTrue: true, explanation: "Frogs are the only known animals that can distinguish colors in extremely low light." },
  { text: "Male frogs have vocal sacs; females don't.", isTrue: true, explanation: "In most species only males have vocal sacs — the balloon-like pouches that amplify their calls." },
  { text: "A frog's skin is waterproof.", isTrue: false, explanation: "Frog skin is permeable — water and gases pass through it easily. That's why they dehydrate quickly." },

  // ========== Jumping & movement ==========
  { text: "Frogs can jump up to 20 times their body length.", isTrue: true, explanation: "Some frogs, like the rocket frog, can leap over 50 times their body length." },
  { text: "The world record frog jump is over 20 feet.", isTrue: true, explanation: "A South African sharp-nosed frog once covered 33 feet in three consecutive leaps." },
  { text: "All frogs can jump.", isTrue: false, explanation: "Many frogs — including some tree frogs and burrowing species — walk or crawl rather than jump." },
  { text: "A frog's leg muscles are mostly slow-twitch fibers.", isTrue: false, explanation: "They're mostly fast-twitch fibers, which is what makes those explosive leaps possible." },
  { text: "Frogs use their arms to cushion their landings.", isTrue: true, explanation: "They stretch out their front limbs mid-leap to absorb impact when they land." },
  { text: "Frogs can swim backward.", isTrue: false, explanation: "Frog anatomy only allows forward propulsion in water — they can't paddle in reverse." },
  { text: "Tree frogs can glide between trees.", isTrue: true, explanation: "Flying frogs have webbed fingers and toes that act like parachutes for gliding dozens of feet." },

  // ========== Diet & hunting ==========
  { text: "Tadpoles are herbivores, but adult frogs are carnivores.", isTrue: true, explanation: "Tadpoles eat algae and plants, but adult frogs eat insects, worms, and other small animals." },
  { text: "Frogs can swallow prey larger than their head.", isTrue: true, explanation: "Flexible jaws and stretchy stomachs let frogs eat surprisingly large prey, including small snakes and birds." },
  { text: "Bullfrogs will eat other frogs.", isTrue: true, explanation: "Bullfrogs are opportunistic predators and happily eat smaller frogs, including members of their own species." },
  { text: "Frogs chew their food thoroughly before swallowing.", isTrue: false, explanation: "Frogs don't chew — they swallow prey whole, using their eyes to push it down the throat." },
  { text: "Frogs can starve themselves for months.", isTrue: true, explanation: "Many frogs can survive long fasts, especially during hibernation or dry seasons." },
  { text: "Frogs only eat live prey.", isTrue: false, explanation: "Most wild frogs prefer moving prey, but many will eat dead insects, and some species scavenge." },
  { text: "Some frogs eat small mammals like mice.", isTrue: true, explanation: "Large species like the African bullfrog and horned frog regularly eat mice, lizards, and small birds." },
  { text: "Frogs use their eyes to help them swallow.", isTrue: true, explanation: "They retract their eyeballs into the roof of the mouth to push food down the esophagus." },

  // ========== Reproduction ==========
  { text: "Frogs lay their eggs on dry land.", isTrue: false, explanation: "Most frogs lay eggs in water, though a few species lay them on wet leaves or in foam nests." },
  { text: "A single frog can lay thousands of eggs at once.", isTrue: true, explanation: "Many frog species lay anywhere from a few hundred to over 20,000 eggs in a single clutch." },
  { text: "The Darwin's frog carries its tadpoles in its vocal sac.", isTrue: true, explanation: "The male Darwin's frog incubates its young inside its vocal sac until they emerge as tiny frogs." },
  { text: "Male midwife toads carry eggs on their back legs.", isTrue: true, explanation: "The male winds strings of eggs around his hind legs and carries them until they're ready to hatch." },
  { text: "Surinam toads carry eggs embedded in the mother's back.", isTrue: true, explanation: "Eggs sink into the skin on the female's back and later tiny toadlets emerge from her skin pockets." },
  { text: "All frog eggs hatch into tadpoles.", isTrue: false, explanation: "A few species skip the tadpole stage entirely and hatch as miniature frogs." },
  { text: "The gastric-brooding frog incubated its young in its stomach.", isTrue: true, explanation: "This now-extinct frog turned off its stomach acid and let tadpoles grow inside — then burped them up." },
  { text: "Frog eggs have hard shells like bird eggs.", isTrue: false, explanation: "Frog eggs are coated in a soft, jelly-like substance, not a hard shell." },
  { text: "Some frogs lay eggs in trees.", isTrue: true, explanation: "Red-eyed tree frogs and others attach eggs to leaves overhanging water; tadpoles drop down when they hatch." },
  { text: "Tadpoles grow their back legs before their front legs.", isTrue: true, explanation: "Hind legs appear first, then front legs push through — the opposite of what many people assume." },
  { text: "A tadpole's tail falls off during metamorphosis.", isTrue: false, explanation: "The tail is reabsorbed into the body for nutrients, not shed." },
  { text: "Male frogs sometimes outnumber females 10 to 1 at breeding sites.", isTrue: true, explanation: "Male frogs often arrive first and in huge numbers at breeding ponds to compete for mates." },
  { text: "Frogs form lifelong monogamous pairs.", isTrue: false, explanation: "The vast majority of frogs don't pair-bond — they mate seasonally with multiple partners." },

  // ========== Size records ==========
  { text: "The goliath frog can grow larger than a housecat.", isTrue: true, explanation: "Goliath frogs can reach over a foot long and weigh up to 7 pounds." },
  { text: "The world's smallest frog is smaller than a dime.", isTrue: true, explanation: "Paedophryne amauensis, from Papua New Guinea, is about 7.7 mm long — smaller than a dime." },
  { text: "The goliath frog builds its own ponds.", isTrue: true, explanation: "Males move stones weighing up to 4 pounds to build nursery pools for their eggs." },
  { text: "The world's largest tadpole can be bigger than the adult frog it becomes.", isTrue: true, explanation: "The paradoxical frog's tadpole reaches 10 inches, but the adult shrinks to about 2.5 inches." },

  // ========== Poisonous & dangerous ==========
  { text: "All frogs are poisonous to humans.", isTrue: false, explanation: "Only a small number of frog species are poisonous. Most are completely harmless." },
  { text: "The poison dart frog is one of the most toxic animals on Earth.", isTrue: true, explanation: "The golden poison dart frog contains enough toxin to kill 10 adult humans." },
  { text: "Poison dart frogs make their own poison.", isTrue: false, explanation: "They get their toxins from eating certain ants, mites, and beetles. In captivity, they're harmless." },
  { text: "Cane toads are venomous when squeezed.", isTrue: true, explanation: "Cane toads secrete bufotoxin from parotoid glands behind their eyes — dangerous to pets that bite them." },
  { text: "Touching a frog can give you warts.", isTrue: false, explanation: "This is a myth. Warts are caused by human viruses, not frog contact." },
  { text: "Some frogs have bones that glow when pressed through the skin.", isTrue: false, explanation: "They don't glow visibly through pressure — but some frogs ARE fluorescent under UV light." },
  { text: "Some frogs are fluorescent under UV light.", isTrue: true, explanation: "The polka-dot tree frog was the first known fluorescent frog — it glows blue-green under UV." },
  { text: "The bright colors of poison frogs are a warning signal.", isTrue: true, explanation: "This is called aposematism — predators learn to associate the bright colors with toxicity." },

  // ========== Climate & survival ==========
  { text: "Some frogs can survive being frozen solid.", isTrue: true, explanation: "The wood frog can freeze almost completely in winter and thaw back to life in spring." },
  { text: "Wood frogs stop their hearts during winter.", isTrue: true, explanation: "A frozen wood frog's heart literally stops beating and restarts when it thaws in spring." },
  { text: "All frogs hibernate during winter.", isTrue: false, explanation: "Only frogs in cold climates hibernate. Tropical frogs stay active year-round." },
  { text: "Desert frogs can live without water for years.", isTrue: true, explanation: "The water-holding frog burrows underground and can survive 5+ years sealed in a mucus cocoon." },
  { text: "Frogs sweat to cool down.", isTrue: false, explanation: "Frogs don't sweat — they stay cool by seeking shade, water, or burrowing." },
  { text: "Some frogs can survive being almost entirely dehydrated.", isTrue: true, explanation: "Certain burrowing frogs can lose up to 60% of their body water and still survive." },
  { text: "Frogs can live for over 100 years.", isTrue: false, explanation: "Most frogs live 4–15 years. The oldest recorded was around 40, nowhere near 100." },

  // ========== Species diversity ==========
  { text: "There are more than 7,000 species of frog.", isTrue: true, explanation: "Scientists have identified over 7,500 frog species, and more are discovered every year." },
  { text: "Frogs are found on every continent.", isTrue: false, explanation: "Frogs live on every continent except Antarctica." },
  { text: "Frogs and toads are the same animal.", isTrue: false, explanation: "All toads are frogs, but not all frogs are toads. Toads are a specific family within the frog order." },
  { text: "Toads generally have drier, bumpier skin than frogs.", isTrue: true, explanation: "True toads tend to have thicker, warty skin suited to drier environments." },
  { text: "Tree frogs have sticky pads on their toes.", isTrue: true, explanation: "Specialized toe pads use mucus and tiny channels to cling to leaves, bark, and even glass." },
  { text: "Glass frogs have transparent skin on their bellies.", isTrue: true, explanation: "You can see their heart, liver, and intestines right through the skin on their undersides." },
  { text: "The hairy frog has actual mammal hair.", isTrue: false, explanation: "The 'hairs' on a hairy frog are hair-like skin filaments that help it absorb more oxygen — not real hair." },
  { text: "The hairy frog can break its own bones to make claws.", isTrue: true, explanation: "When threatened, it fractures its toe bones and pushes them through the skin as defensive claws." },
  { text: "The purple frog spends most of its life underground.", isTrue: true, explanation: "The purple frog lives buried in soil year-round and only surfaces for about two weeks to breed." },
  { text: "Mountain chicken frogs are actually chickens.", isTrue: false, explanation: "They're frogs — nicknamed 'mountain chicken' because they were traditionally eaten and taste like chicken." },
  { text: "The Vietnamese mossy frog is almost invisible on moss-covered rocks.", isTrue: true, explanation: "Its bumpy, green-and-black skin is a near-perfect match for the moss and lichen of its habitat." },

  // ========== Behavior ==========
  { text: "A group of frogs is called an 'army'.", isTrue: true, explanation: "Yes — a group of frogs is called an army, and a group of toads is called a knot." },
  { text: "All frogs croak.", isTrue: false, explanation: "Different species chirp, whistle, bark, grunt, or even scream. Only some actually croak." },
  { text: "Each frog species has a unique call.", isTrue: true, explanation: "Calls are so distinctive that scientists can often identify a species from audio alone." },
  { text: "Male frogs call to attract mates.", isTrue: true, explanation: "In most species, calling is a male-only activity used to attract females and warn off rival males." },
  { text: "Frogs can make a call that sounds like a sheep's bleat.", isTrue: true, explanation: "The sheep frog of Texas makes a bleating call that sounds remarkably like a lamb." },
  { text: "Some frogs scream when attacked.", isTrue: true, explanation: "A startled frog may let out a surprisingly loud, high-pitched scream to startle predators." },
  { text: "Frogs communicate by changing color.", isTrue: false, explanation: "Many frogs change color, but it's for camouflage or temperature regulation — not communication." },
  { text: "Some frogs can climb trees over 100 feet tall.", isTrue: true, explanation: "Many tree frogs live their entire adult lives in the forest canopy, high above the ground." },
  { text: "Frogs blink to help push food down their throat.", isTrue: true, explanation: "When a frog blinks, its eyes press inward and help shove swallowed prey into the esophagus." },
  { text: "Frogs can recognize individual humans.", isTrue: false, explanation: "There's no good evidence frogs recognize individual people — they mostly react to size and movement." },
  { text: "Frogs 'dance' to warn off rivals.", isTrue: true, explanation: "Some tropical frogs living near loud waterfalls wave their legs because calls can't be heard." },

  // ========== Myths & misconceptions ==========
  { text: "A frog placed in slowly heating water will not jump out.", isTrue: false, explanation: "The 'boiling frog' story is a myth. Real frogs do jump out when water gets uncomfortably warm." },
  { text: "Kissing a frog can turn it into a prince.", isTrue: false, explanation: "No, but it will probably stress the frog out — and some frogs' skin is toxic." },
  { text: "Frogs drink the water they swim in.", isTrue: false, explanation: "Frogs never actually drink. They absorb all the water they need through their skin." },
  { text: "Frogs have been on Earth longer than dinosaurs.", isTrue: false, explanation: "Frogs appeared around 200 million years ago — after the first dinosaurs, which showed up ~230 million years ago." },
  { text: "Frogs are classified as reptiles.", isTrue: false, explanation: "Frogs are amphibians, which are a distinct class from reptiles like lizards and snakes." },
  { text: "Toads cause warts.", isTrue: false, explanation: "Warts are caused by viruses, not amphibians. You cannot get warts from handling a toad." },

  // ========== Ecology & environment ==========
  { text: "Frogs are considered indicators of environmental health.", isTrue: true, explanation: "Their permeable skin makes them highly sensitive to pollution, so population changes signal problems." },
  { text: "More than one-third of frog species are threatened with extinction.", isTrue: true, explanation: "Habitat loss, climate change, and the chytrid fungus have put over 40% of amphibians at risk." },
  { text: "A single fungal disease has caused the extinction of dozens of frog species.", isTrue: true, explanation: "The chytrid fungus (Bd) has driven at least 90 amphibian species to extinction worldwide." },
  { text: "Frogs help control mosquito populations.", isTrue: true, explanation: "Many frogs and especially tadpoles eat mosquito larvae, keeping their numbers in check." },
  { text: "Frogs are only found near permanent water.", isTrue: false, explanation: "Many species live in deserts, high mountains, or forests far from standing water for most of the year." },
  { text: "Rainforest frogs are more diverse than frogs anywhere else.", isTrue: true, explanation: "Tropical rainforests host the greatest diversity of frog species on Earth." },
  { text: "Frogs can live at elevations above 15,000 feet.", isTrue: true, explanation: "The Lake Titicaca frog and some Himalayan species thrive at extreme elevations." },

  // ========== Senses & sunscreen ==========
  { text: "Some frogs make their own sunscreen.", isTrue: true, explanation: "Certain frog species secrete compounds that protect their skin from UV radiation." },
  { text: "Frogs can smell underwater.", isTrue: true, explanation: "Frogs have specialized nasal passages that let them detect chemicals in both air and water." },
  { text: "Frogs have taste buds on their tongues like humans.", isTrue: true, explanation: "Frogs have taste buds, though far fewer than humans, and they can distinguish bitter, sweet, salty, and sour." },
  { text: "Frogs can feel vibrations through the ground.", isTrue: true, explanation: "They detect ground vibrations through their legs, which helps them sense approaching predators." },

  // ========== Pop culture & naming ==========
  { text: "Kermit the Frog is a real species of frog found in Costa Rica.", isTrue: false, explanation: "There's a glass frog nicknamed 'the Kermit frog' because it resembles him, but no species is officially named Kermit." },
  { text: "A frog species was named after Prince Charles.", isTrue: true, explanation: "Hyloscirtus princecharlesi, an Ecuadorian stream frog, was named for his conservation efforts." },
  { text: "There's a frog species named after Mick Jagger.", isTrue: false, explanation: "No frog carries Jagger's name, though several lizard and dinosaur species do." },
  { text: "The term 'frogman' for a diver comes from WWII.", isTrue: true, explanation: "Combat divers in World War II were nicknamed 'frogmen' for their flippers and amphibious work." },
  { text: "Frog figurines are considered lucky in many cultures.", isTrue: true, explanation: "In Chinese and Japanese tradition, frogs symbolize wealth, luck, and safe travel." },

  // ========== Weird & surprising ==========
  { text: "Some frogs can regrow lost limbs.", isTrue: false, explanation: "Adult frogs cannot regrow limbs, though tadpoles can regenerate tails and partial limbs." },
  { text: "Scientists have made frogs levitate using magnets.", isTrue: true, explanation: "In 1997, researchers used a powerful magnetic field to make a live frog float in mid-air." },
  { text: "A frog was the first vertebrate successfully cloned.", isTrue: true, explanation: "In 1952, scientists cloned a leopard frog, decades before Dolly the sheep." },
  { text: "Frogs can be trained to perform tricks.", isTrue: false, explanation: "Frogs lack the cognitive flexibility for trick training — they operate largely on instinct and reflex." },
  { text: "Frogs have been to space.", isTrue: true, explanation: "NASA has sent frogs to space multiple times to study the effects of microgravity on development." },
  { text: "A frog's slime can be used to make glue.", isTrue: true, explanation: "Researchers are studying frog mucus for medical-grade adhesives that work on wet surfaces." },
  { text: "Some frog slime can numb pain better than morphine.", isTrue: true, explanation: "Compounds in the Phyllomedusa frog's skin have shown pain-killing properties stronger than morphine." },
  { text: "Frogs have been found inside solid rock.", isTrue: false, explanation: "Despite old folklore, there's no verified case of a live frog sealed inside solid stone." },
  { text: "A frog's call can be louder than a chainsaw.", isTrue: true, explanation: "The coqui frog can reach 100 decibels at close range — comparable to a chainsaw." },
  { text: "Frogs can get sunburned.", isTrue: true, explanation: "Yes — frogs' thin skin makes them vulnerable to UV damage, which is why many are nocturnal or shade-seeking." },
  { text: "Frog embryos can be transparent in their earliest stage.", isTrue: true, explanation: "Many frog embryos are translucent, letting scientists watch cells divide and organs form in real time." },

  // ========== Food & humans ==========
  { text: "People eat frogs in many parts of the world.", isTrue: true, explanation: "Frog legs are a traditional dish in France, Southeast Asia, parts of the US South, and elsewhere." },
  { text: "Only the hind legs of a frog are typically eaten.", isTrue: true, explanation: "Frog legs refers almost exclusively to the muscular hind legs — the rest is usually discarded." },
  { text: "France consumes more frog legs than any other country.", isTrue: false, explanation: "Indonesia is the world's largest exporter and major consumer of frog legs." },
  { text: "Frog meat tastes like chicken.", isTrue: true, explanation: "Frog legs are commonly compared to chicken — mild, white, and slightly firm." },

  // ========== Lifespan & aging ==========
  { text: "Tadpoles can take several years to become frogs.", isTrue: true, explanation: "Some species, like the American bullfrog, can spend 2–3 years as tadpoles before metamorphosis." },
  { text: "Metamorphosis always takes about a week.", isTrue: false, explanation: "Metamorphosis varies hugely — from a few weeks to a few years depending on species and conditions." },
  { text: "Captive frogs tend to live longer than wild ones.", isTrue: true, explanation: "Without predators, disease pressure, or drought, pet frogs often outlive wild counterparts significantly." },

  // ========== Weirder yet true ==========
  { text: "The African clawed frog was once used as a pregnancy test.", isTrue: true, explanation: "In the mid-1900s, injecting a woman's urine into a female clawed frog would cause the frog to lay eggs if the woman was pregnant." },
  { text: "A frog's heart can be removed and keep beating for hours.", isTrue: true, explanation: "An isolated frog heart will continue to beat if kept in the right salt solution — a classic biology demo." },
  { text: "Frogs played a role in developing lithium-ion batteries.", isTrue: false, explanation: "Frogs weren't involved in Li-ion battery development — though Galvani's frog experiments did inspire early battery science." },
  { text: "Luigi Galvani's experiments on frog legs led to the discovery of bioelectricity.", isTrue: true, explanation: "Galvani's 1780s experiments making frog legs twitch with electricity founded the field of electrophysiology." },
  { text: "Some frogs smell like peanut butter.", isTrue: true, explanation: "The chimney frog of Panama reportedly smells distinctly of peanut butter when handled." },
  { text: "Frogs have been found with extra limbs due to pollution.", isTrue: true, explanation: "Parasites and chemical pollutants have caused mass deformities, including frogs with 5 or more legs." },

  // ========== Species-specific ==========
  { text: "The red-eyed tree frog has red eyes to startle predators.", isTrue: true, explanation: "When threatened, it flashes its bright red eyes to shock predators — a tactic called startle coloration." },
  { text: "Bullfrogs are native to every continent they inhabit.", isTrue: false, explanation: "American bullfrogs are native to North America but have become invasive on several continents." },
  { text: "The tomato frog gets its name from its bright red color.", isTrue: true, explanation: "Native to Madagascar, this plump round frog is famously tomato-red." },
  { text: "The African bullfrog is one of the few frogs that cares for its young.", isTrue: true, explanation: "Male African bullfrogs guard their tadpoles and even dig channels to keep them from drying out." },
  { text: "Pacman frogs are named after the video game character.", isTrue: true, explanation: "Horned frogs are nicknamed 'Pacman frogs' because of their round shape and huge mouths." },
  { text: "The common frog is actually quite rare worldwide.", isTrue: false, explanation: "The common frog (Rana temporaria) is widespread across Europe and genuinely common." },
  { text: "There's a frog species that lives entirely in waterfalls.", isTrue: true, explanation: "The torrent frogs live in or beside fast-flowing streams and waterfalls, with suction-cup toes to hold on." },
  { text: "Pumpkin toadlets can't hear their own calls.", isTrue: true, explanation: "These tiny Brazilian frogs call to each other but lack the ear structures to actually hear the calls." },

  // ========== Random extras ==========
  { text: "A frog can starve to death surrounded by dead flies.", isTrue: true, explanation: "Most frogs will only strike at moving prey — a pile of still food is often invisible to them." },
  { text: "Frogs typically breathe through their mouths.", isTrue: false, explanation: "Frogs breathe through their nostrils and skin, usually with their mouths firmly closed." },
  { text: "Frogs have been used in NASA space experiments.", isTrue: true, explanation: "Frog eggs and tadpoles have flown on multiple Space Shuttle missions to study development in microgravity." },
  { text: "Some frogs lay their eggs in water-filled holes in trees.", isTrue: true, explanation: "Many tropical frogs use tiny pools inside bromeliads or tree hollows as nurseries." },
  { text: "The oldest known frog fossil is about 50 million years old.", isTrue: false, explanation: "The oldest frog-like fossils are around 200 million years old, from the early Jurassic." },
  { text: "Frog skin contains natural antibiotics.", isTrue: true, explanation: "Many frog species produce peptides on their skin that fight bacteria, fungi, and even some viruses." },
  { text: "A frog can jump from a dead stop.", isTrue: true, explanation: "Frogs don't need a running start — their coiled hind legs act like a spring from a standstill." },
  { text: "Frogs have salivary glands.", isTrue: true, explanation: "Yes — and frog saliva uniquely changes viscosity on impact, letting it catch and release prey." },
  { text: "Frogs breathe faster when they're stressed.", isTrue: true, explanation: "You can often tell a stressed frog by rapid pulsing of its throat as it breathes faster." },
  { text: "Frogs can learn to associate colors with food.", isTrue: true, explanation: "Studies show frogs can be conditioned to associate specific colors with feeding." },
  { text: "The axolotl is a type of frog.", isTrue: false, explanation: "The axolotl is a salamander — a different kind of amphibian, not a frog." },
  { text: "Caecilians are legless amphibians, not frogs.", isTrue: true, explanation: "Caecilians are a third amphibian group — limbless, mostly burrowing, and distinct from frogs and salamanders." },
  { text: "There's a species of frog that lives entirely in bromeliads.", isTrue: true, explanation: "The bromeliad tree frog spends its whole life in the tiny pools formed in bromeliad plants." },
  { text: "Frogs can detect polarized light.", isTrue: true, explanation: "Frogs can sense the polarization of light, helping them navigate during migrations." },
  { text: "Male frogs sometimes mount other males by mistake.", isTrue: true, explanation: "In crowded breeding sites, males grab anything frog-shaped — the mistaken male gives a 'release call'." },
  { text: "Frogs always face into the current when sitting in a stream.", isTrue: false, explanation: "They orient however they like — though facing the current can help some species breathe or catch prey." },
  { text: "Frog larvae have gills.", isTrue: true, explanation: "Tadpoles breathe underwater using external then internal gills before developing lungs." },
  { text: "Frogs can jump out of water.", isTrue: true, explanation: "Many aquatic frogs launch themselves clear out of the water to escape predators or snatch flying insects." },
  { text: "A frog's eyeballs weigh more than its brain.", isTrue: true, explanation: "A frog's eyes are massive relative to its small brain — anatomically bigger than the brain itself." },
  { text: "Frog eggs develop faster in warmer water.", isTrue: true, explanation: "Temperature strongly affects embryo development; warmer water usually means faster hatching." },
  { text: "Frogs can be left-handed or right-handed.", isTrue: true, explanation: "Studies show individual frogs have a preferred limb for tasks like wiping food off their faces." },
  { text: "The strawberry poison frog carries its tadpoles up trees one by one.", isTrue: true, explanation: "Females carry each tadpole individually up a tree to deposit it in a water-filled bromeliad." },
  { text: "Frogs produce their calls using their lungs and vocal cords.", isTrue: true, explanation: "Air pushed from the lungs over the vocal cords, then amplified by the vocal sac, creates the call." },
  { text: "Only male frogs can jump long distances.", isTrue: false, explanation: "Males and females both jump. In many species females are actually larger and jump farther." },
  { text: "There's a frog named after Charles Darwin.", isTrue: true, explanation: "Darwin's frog (Rhinoderma darwinii) was discovered by Darwin during his Beagle voyage in Chile." },
  { text: "Frogs can be allergic to things like humans can.", isTrue: false, explanation: "True allergic responses as we know them haven't been documented in frogs." },
  { text: "Some frogs have translucent skin on their backs too.", isTrue: false, explanation: "Glass frogs are only transparent on their undersides; their backs are green for camouflage." },
  { text: "Tadpoles can delay metamorphosis if conditions are bad.", isTrue: true, explanation: "If a pond is drying out or food is scarce, many tadpole species can delay or accelerate development." },
  { text: "The chytrid fungus kills frogs by suffocating them through the skin.", isTrue: true, explanation: "Chytrid thickens the skin so much that frogs can no longer absorb water, salts, or oxygen properly." },
  { text: "Frogs sleep in groups for warmth.", isTrue: false, explanation: "Most frogs are solitary. They don't huddle for warmth, though they may share hibernation sites." },
  { text: "Some frogs lay eggs that don't need water at all.", isTrue: true, explanation: "Several species lay eggs on land that hatch directly into tiny frogs — no tadpole, no pond required." },
  { text: "Frogs can be found at the Arctic Circle.", isTrue: true, explanation: "The wood frog's range extends above the Arctic Circle — the only amphibian to do so." },
  { text: "A frog's slime always smells bad.", isTrue: false, explanation: "Many frog skin secretions are odorless; some smell like garlic, peanut butter, or even vanilla." },
  { text: "Frogs can see directly behind themselves without turning.", isTrue: true, explanation: "Their eye placement gives them nearly 360-degree vision, including some view directly behind." },
  { text: "Some tadpoles are cannibals.", isTrue: true, explanation: "In crowded or food-poor conditions, tadpoles of several species will eat each other." },
  { text: "A frog's heart has four chambers like a human's.", isTrue: false, explanation: "Three chambers — two atria and one ventricle. Only mammals and birds have fully four-chambered hearts." },
  { text: "The African dwarf frog is fully aquatic as an adult.", isTrue: true, explanation: "African dwarf frogs live their entire lives underwater, surfacing only to breathe." },
  { text: "Frogs can live without food for a year.", isTrue: true, explanation: "Many frogs can survive extended fasts, especially during hibernation or burrowed estivation." },
  { text: "A frog's leg can be used to detect electricity.", isTrue: true, explanation: "Dissected frog legs twitch in response to electrical current — Galvani's famous experiment." },
  { text: "Frogs can see ultraviolet light.", isTrue: true, explanation: "Frogs have cones sensitive to UV, which helps them locate water and identify prey." },
  { text: "Some frog species are entirely female.", isTrue: true, explanation: "A few frog populations consist entirely of females that reproduce by hybridogenesis or similar methods." },
  { text: "Frogs digest food in days.", isTrue: true, explanation: "Depending on size and temperature, frogs typically digest a meal in 1–3 days." },
  { text: "A frog's heart can regrow damaged tissue.", isTrue: false, explanation: "Frogs can't regenerate heart tissue — zebrafish and salamanders are the usual stars of heart regeneration research." },
  { text: "Some frogs can walk on water for short distances.", isTrue: false, explanation: "No frog actually runs on water; that's basilisk lizards. Frogs rely on jumping and swimming." },
  { text: "There's a frog species whose males fight using 'swords' on their thumbs.", isTrue: true, explanation: "Male 'otton frogs have spiny thumb spikes they use in brutal fights over mates." },
  { text: "Pacific tree frogs are the frogs you hear in Hollywood movies.", isTrue: true, explanation: "The 'ribbit' sound Hollywood overuses is actually the Pacific tree frog, recorded in California." },
  { text: "The common 'ribbit' is the universal frog call.", isTrue: false, explanation: "Only a handful of frog species actually ribbit; most make completely different sounds." },
  { text: "Frogs can be purple.", isTrue: true, explanation: "The purple frog of India is genuinely purple-pink, with a bulbous body built for a life underground." },
  { text: "The cane toad was introduced to Australia to control beetles.", isTrue: true, explanation: "Introduced in 1935 to control cane beetles, cane toads instead became one of Australia's worst invasive species." },
  { text: "Frogs taste with their skin.", isTrue: false, explanation: "Frogs taste with taste buds on their tongue and mouth — their skin senses chemistry but not flavor." },
  { text: "Frogs can see motion but not static objects well.", isTrue: true, explanation: "Frog vision is tuned for motion detection; a motionless insect may be essentially invisible to them." },
  { text: "Some frogs can jump out of a boiling pot before the water heats up.", isTrue: true, explanation: "Any frog in actually boiling water would just die instantly. The 'slow boil' story is a myth." },
  { text: "Frogs molt their skin in one piece.", isTrue: true, explanation: "A shedding frog pulls its skin off whole, often from head to toe, and usually eats it afterwards." },
  { text: "Some frogs sleep standing up.", isTrue: false, explanation: "Frogs typically rest sitting or lying flat; they don't 'stand' in a sleeping posture." },
  { text: "A frog's heart beats faster when it's warm.", isTrue: true, explanation: "As ectotherms, warmer temperatures speed up a frog's metabolism and heart rate." },
  { text: "Tadpoles have teeth.", isTrue: true, explanation: "Tadpoles have small keratinous beaks and tooth rows used to scrape algae." },
  { text: "Adult frogs lose their tadpole teeth.", isTrue: true, explanation: "Those keratin tooth rows are absorbed during metamorphosis along with the rest of the mouthparts." },
  { text: "The surinam toad is nearly flat.", isTrue: true, explanation: "The surinam toad has a bizarre flat, leaf-like shape — perfect camouflage on riverbeds." },
  { text: "Frogs breathe through their nostrils when the mouth is closed.", isTrue: true, explanation: "They have a special pump mechanism using the floor of the mouth to draw air through the nostrils." },
  { text: "Some frogs have been observed using tools.", isTrue: false, explanation: "No frog species has been documented using tools in the wild." },
  { text: "Frogs can be color-blind.", isTrue: false, explanation: "Frogs actually have excellent color vision — among the best of any animal." },
  { text: "Male spring peepers call so loudly that a group sounds like sleigh bells.", isTrue: true, explanation: "A chorus of spring peepers in early spring is a classic, beautiful jingling sound." },
  { text: "The glass frog has a transparent heart.", isTrue: true, explanation: "You can watch a glass frog's heart beat in real time through its skin." },
  { text: "Frogs can be used to monitor water quality.", isTrue: true, explanation: "Frog presence, diversity, and health are standard bioindicators of freshwater ecosystem health." },
  { text: "The call of a frog can travel over a mile.", isTrue: true, explanation: "Loud species like bullfrogs can be heard well over a mile away on still nights." },
  { text: "Toads can swim as well as frogs.", isTrue: false, explanation: "True toads are generally much weaker swimmers than frogs — their bodies are built for land." },
  { text: "A frog's hind legs can be more than half its body length.", isTrue: true, explanation: "Many species have hind legs longer than their entire body, especially elite jumpers." },
  { text: "Some frogs make foam nests above water.", isTrue: true, explanation: "Several tree frog species whip up foamy nests on branches; tadpoles drop into water below when they hatch." },
  { text: "Frogs can be used in high school biology dissections.", isTrue: true, explanation: "Though less common now, frog dissection has been a staple of biology education for over a century." },
  { text: "The world's most venomous frog can kill with a touch.", isTrue: true, explanation: "The golden poison frog's skin toxin can be lethal to a human even in tiny doses — don't touch." },
  { text: "Frogs can hear higher pitches than humans.", isTrue: true, explanation: "Some frogs can hear ultrasonic sounds, well above the human hearing range." },
];

// Fisher-Yates shuffle
function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Returns a fresh shuffled queue. When exhausted, caller should ask again.
// Later: swap this for an async LLM call that fetches a batch.
function getFactQueue() {
  return shuffle(FROG_FACTS);
}
