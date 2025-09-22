import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

// XML Fragment definitions based on your clean structure
const XML_FRAGMENTS = {
  // HUB (return point after finishing any thread)
  HUB: `<character name="NARRATOR">
  <say>Who do you sit with?</say>
</character>

<choices>
  <choice id="talk_lumine">Talk to Lumine about journeying between worlds</choice>
  <choice id="talk_zhongli">Ask Zhongli about the contracts and destiny</choice>
  <choice id="talk_tartaglia">Discuss the harbor's restlessness with Tartaglia</choice>
  <choice id="talk_venti">Listen to Venti's stories about ancient seals</choice>
  <choice id="end_story">End the conversation</choice>
</choices>`,

  // LUMINE thread (L1 → L2 → Close → Hub)
  LUMINE_L1: `<character name="Lumine">
  <action expression="Concern">Stepping closer, studying you carefully</action>
  <say>You look tired. How long have you been traveling?</say>
  <action expression="Neutral">Her voice softening with understanding</action>
  <say>I know what it's like to search for something... or someone.</say>
</character>

<choices>
  <choice id="lumine_l1_honest">Be honest about your search</choice>
  <choice id="lumine_l1_deflect">Deflect politely</choice>
  <choice id="lumine_l1_joke">Joke to lighten the mood</choice>
  <choice id="hub_choose_other">Talk to someone else</choice>
</choices>`,

  LUMINE_L2: `<character name="Lumine">
  <action expression="Sad">Her expression grows distant, memories clouding her golden eyes</action>
  <say>Searching is heavy... but lighter when shared.</say>
</character>

<choices>
  <choice id="lumine_l2_her_journey">Ask about her journey</choice>
  <choice id="lumine_l2_harbor">Ask about Liyue Harbor</choice>
  <choice id="hub_choose_other">Talk to someone else</choice>
</choices>`,

  LUMINE_CLOSE: `<character name="Lumine">
  <action expression="Determined">Clenching her fists with renewed resolve</action>
  <say>We crossed more worlds than I can count... until an unknown god tore us apart.</say>
  <action expression="Hope">Meeting your gaze</action>
  <say>Maybe that's why your arrival feels right. Two wanderers searching, side by side.</say>
</character>

<character name="Lumine">
  <action expression="Happy">A gentle smile touches her lips</action>
  <say>Tea later? Stories go down easier warm.</say>
</character>

<choices>
  <choice id="hub_return_after_lumine">Return to the group</choice>
</choices>`,

  // ZHONGLI thread (Z1 → Z2 → Close → Hub)
  ZHONGLI_L1: `<character name="Zhongli">
  <action expression="Thinking">Pouring tea with ritual grace</action>
  <say>Hospitality precedes inquiry. Please.</say>
</character>

<choices>
  <choice id="zhongli_l1_etiquette">Follow his etiquette carefully</choice>
  <choice id="zhongli_l1_casual">Drink casually</choice>
  <choice id="hub_choose_other">Talk to someone else</choice>
</choices>`,

  ZHONGLI_L2: `<character name="Zhongli">
  <action expression="Neutral">Amber eyes reflecting lamplight</action>
  <say>Ancient pacts fray when memory fades. Liyue stands on promises older than stone.</say>
</character>

<choices>
  <choice id="zhongli_l2_seals">Ask about the weakening seals</choice>
  <choice id="zhongli_l2_stakeholders">Ask about the Qixing, adepti, and guilds</choice>
  <choice id="hub_choose_other">Talk to someone else</choice>
</choices>`,

  ZHONGLI_CLOSE: `<character name="Zhongli">
  <action expression="Thinking">Tracing a quiet ring on the table</action>
  <say>When contracts strain, clarity is currency. Perhaps your arrival fulfills a clause long dormant.</say>
</character>

<choices>
  <choice id="hub_return_after_zhongli">Return to the group</choice>
</choices>`,

  // TARTAGLIA thread (T1 → T2 → Close → Hub)
  TARTAGLIA_L1: `<character name="Tartaglia">
  <action expression="Confident">Cracking his knuckles, playful stance</action>
  <say>Harbor's restless. Do you dance with storms—or hide from them?</say>
</character>

<choices>
  <choice id="tartaglia_l1_spar">Accept a friendly spar later</choice>
  <choice id="tartaglia_l1_banter">Boast back</choice>
  <choice id="tartaglia_l1_intel">Steer to intel</choice>
  <choice id="hub_choose_other">Talk to someone else</choice>
</choices>`,

  TARTAGLIA_L2: `<character name="Tartaglia">
  <action expression="Serious">The grin sharpens to a hunter's focus</action>
  <say>Pressure shows truth. This city's brimming with it.</say>
</character>

<choices>
  <choice id="tartaglia_l2_clues">Ask what he's noticed</choice>
  <choice id="tartaglia_l2_tease">Tease him about theatrics</choice>
  <choice id="hub_choose_other">Talk to someone else</choice>
</choices>`,

  TARTAGLIA_CLOSE: `<character name="Tartaglia">
  <action expression="Confident">Predatory smile easing back to playful</action>
  <say>Strange movements in every nation. Old powers stirring… and you smell like trouble I'd like to meet again.</say>
</character>

<choices>
  <choice id="hub_return_after_tartaglia">Return to the group</choice>
</choices>`,

  // VENTI thread (V1 → V2 → Close → Hub)
  VENTI_L1: `<character name="Venti">
  <action expression="Happy">A playful arpeggio dances through the air</action>
  <say>Old winds hum of locks and keys… and a traveler out of time.</say>
</character>

<choices>
  <choice id="venti_l1_decode">Ask him to decode the verse</choice>
  <choice id="venti_l1_courage_song">Request a song for courage</choice>
  <choice id="hub_choose_other">Talk to someone else</choice>
</choices>`,

  VENTI_L2: `<character name="Venti">
  <action expression="Thinking">His cheerful mask slips—something ancient peers through</action>
  <say>The winds whisper of voices behind stone, and tide-lyrics carved near the waterline.</say>
</character>

<choices>
  <choice id="venti_l2_parse">Parse the riddle</choice>
  <choice id="venti_l2_more_verse">Laugh it off and ask for another verse</choice>
  <choice id="hub_choose_other">Talk to someone else</choice>
</choices>`,

  VENTI_CLOSE: `<character name="Venti">
  <action expression="Wise">Twinkle-eyed, conspiratorial</action>
  <say>When the breeze stalls, sing it forward. Promises made under starlit skies never quite fade.</say>
</character>

<choices>
  <choice id="hub_return_after_venti">Return to the group</choice>
</choices>`,

  // END (optional finale)
  END: `<Narrator>As the evening winds down, warmth and murmurs linger. Threads have been tied—some taut, some left to sway in the night air.</Narrator>
<Narrator>Whatever brought you here is only the prologue. The harbor moon climbs; your path is just beginning.</Narrator>`
};

// Generate HUB with disabled options for completed threads
function generateHubWithCompletedThreads(completedThreads: string[]): string {
  console.log('🏠 Generating HUB with completed threads:', completedThreads);
  
  const choices = [
    { id: 'talk_lumine', text: 'Talk to Lumine about journeying between worlds', character: 'lumine' },
    { id: 'talk_zhongli', text: 'Ask Zhongli about the contracts and destiny', character: 'zhongli' },
    { id: 'talk_tartaglia', text: 'Discuss the harbor\'s restlessness with Tartaglia', character: 'tartaglia' },
    { id: 'talk_venti', text: 'Listen to Venti\'s stories about ancient seals', character: 'venti' }
  ];
  
  const choiceElements = choices.map(choice => {
    const isCompleted = completedThreads.includes(choice.character);
    console.log(`🔍 Checking character ${choice.character}: isCompleted=${isCompleted}, completedThreads includes: ${completedThreads.includes(choice.character)}`);
    if (isCompleted) {
      return `  <choice id="completed_${choice.character}" disabled="true">${choice.text} ✅ (Completed)</choice>`;
    } else {
      return `  <choice id="${choice.id}">${choice.text}</choice>`;
    }
  }).join('\n');
  
  return `<character name="NARRATOR">
  <say>Who do you sit with?</say>
</character>

<choices>
${choiceElements}
  <choice id="end_story">End the conversation</choice>
</choices>`;
}

// Choice routing logic
function getNextFragment(choiceId: string, completedThreads: string[] = [], characterProgress: Record<string, string> = {}): string {
  console.log('🎯 Routing choice:', choiceId, 'with completed threads:', completedThreads, 'character progress:', characterProgress);
  
  // Initial character selections - check progress to resume from correct round
  if (choiceId === 'talk_lumine') {
    const progress = characterProgress.lumine;
    console.log('🔍 Lumine progress check:', progress, 'Full characterProgress:', characterProgress);
    if (progress === 'L2') {
      console.log('✅ Returning LUMINE_L2');
      return XML_FRAGMENTS.LUMINE_L2;
    }
    if (progress === 'CLOSE') {
      console.log('✅ Returning LUMINE_CLOSE');
      return XML_FRAGMENTS.LUMINE_CLOSE;
    }
    console.log('✅ Returning LUMINE_L1 (default)');
    return XML_FRAGMENTS.LUMINE_L1; // Default to L1 if no progress
  }
  if (choiceId === 'talk_zhongli') {
    const progress = characterProgress.zhongli;
    if (progress === 'L2') return XML_FRAGMENTS.ZHONGLI_L2;
    if (progress === 'CLOSE') return XML_FRAGMENTS.ZHONGLI_CLOSE;
    return XML_FRAGMENTS.ZHONGLI_L1;
  }
  if (choiceId === 'talk_tartaglia') {
    const progress = characterProgress.tartaglia;
    if (progress === 'L2') return XML_FRAGMENTS.TARTAGLIA_L2;
    if (progress === 'CLOSE') return XML_FRAGMENTS.TARTAGLIA_CLOSE;
    return XML_FRAGMENTS.TARTAGLIA_L1;
  }
  if (choiceId === 'talk_venti') {
    const progress = characterProgress.venti;
    if (progress === 'L2') return XML_FRAGMENTS.VENTI_L2;
    if (progress === 'CLOSE') return XML_FRAGMENTS.VENTI_CLOSE;
    return XML_FRAGMENTS.VENTI_L1;
  }
  
  // Lumine thread progression
  if (choiceId.startsWith('lumine_l1_')) return XML_FRAGMENTS.LUMINE_L2;
  if (choiceId.startsWith('lumine_l2_')) return XML_FRAGMENTS.LUMINE_CLOSE;
  if (choiceId === 'hub_return_after_lumine') return generateHubWithCompletedThreads(completedThreads);
  
  // Zhongli thread progression
  if (choiceId.startsWith('zhongli_l1_')) return XML_FRAGMENTS.ZHONGLI_L2;
  if (choiceId.startsWith('zhongli_l2_')) return XML_FRAGMENTS.ZHONGLI_CLOSE;
  if (choiceId === 'hub_return_after_zhongli') return generateHubWithCompletedThreads(completedThreads);
  
  // Tartaglia thread progression
  if (choiceId.startsWith('tartaglia_l1_')) return XML_FRAGMENTS.TARTAGLIA_L2;
  if (choiceId.startsWith('tartaglia_l2_')) return XML_FRAGMENTS.TARTAGLIA_CLOSE;
  if (choiceId === 'hub_return_after_tartaglia') return generateHubWithCompletedThreads(completedThreads);
  
  // Venti thread progression
  if (choiceId.startsWith('venti_l1_')) return XML_FRAGMENTS.VENTI_L2;
  if (choiceId.startsWith('venti_l2_')) return XML_FRAGMENTS.VENTI_CLOSE;
  if (choiceId === 'hub_return_after_venti') return generateHubWithCompletedThreads(completedThreads);
  
  // Hub navigation
  if (choiceId === 'hub_choose_other') return generateHubWithCompletedThreads(completedThreads);
  
  // End story
  if (choiceId === 'end_story') return XML_FRAGMENTS.END;
  
  // Default fallback
  console.log('⚠️ Unknown choice ID, returning HUB');
  return generateHubWithCompletedThreads(completedThreads);
}

// Cache the initial story content in memory for faster startup
let cachedStoryContent: string | null = null;

async function getInitialStoryContent(): Promise<string> {
  if (!cachedStoryContent) {
    const filePath = join(process.cwd(), 'public', 'sample.xml');
    cachedStoryContent = await readFile(filePath, 'utf-8');
    console.log('📦 Cached initial story content in memory');
  }
  return cachedStoryContent;
}

export async function GET() {
  try {
    // Return cached content as a stream (keeps original structure but faster file access)
    const content = await getInitialStoryContent();
    
    console.log('🚀 Serving cached initial story content as stream');
    
    // Stream the response (keeps original client-side structure intact)
    const stream = new ReadableStream({
      start(controller) {
        // Send the entire XML content at once to avoid parsing issues
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(content));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('❌ Error reading story file:', error);
    return NextResponse.json({ error: 'Failed to load story' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { choice, completedThreads = [], characterProgress = {} } = await request.json();
    console.log('🎮 Processing choice:', choice, 'Completed threads:', completedThreads, 'Character progress:', JSON.stringify(characterProgress, null, 2));
    
    if (!choice) {
      return NextResponse.json({ error: 'Choice is required' }, { status: 400 });
    }
    
    // Get the next XML fragment based on choice ID
    const xmlContent = getNextFragment(choice, completedThreads, characterProgress);
    
    // Stream the response
    const stream = new ReadableStream({
      start(controller) {
        // Send the entire XML content at once to avoid parsing issues
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(xmlContent));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('❌ Error in story POST:', error);
    return NextResponse.json({ error: 'Failed to process choice' }, { status: 500 });
  }
}