'use client';

import { useState } from 'react';
import Image from 'next/image';

interface IllustratedBookProps {
  isVisible: boolean;
  onClose: () => void;
  characterInformation: Record<string, string[]>;
  encounteredCharacters: string[];
}

export function IllustratedBook({ 
  isVisible, 
  onClose, 
  characterInformation, 
  encounteredCharacters 
}: IllustratedBookProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);

  if (!isVisible) return null;

  const characterData = {
    lumine: {
      name: 'Lumine',
      title: 'Traveler from Another World',
      description: 'A mysterious traveler searching for her lost brother across worlds.',
      avatar: '/avatars/Lumine/Happy.png'
    },
    zhongli: {
      name: 'Zhongli',
      title: 'Consultant of Wangsheng Funeral Parlor',
      description: 'A knowledgeable gentleman with deep understanding of contracts and ancient history.',
      avatar: '/avatars/Zhongli/Neutral.png'
    },
    tartaglia: {
      name: 'Tartaglia',
      title: 'Harbinger of the Fatui',
      description: 'A skilled warrior who thrives in conflict and seeks worthy opponents.',
      avatar: '/avatars/Tartaglia/Confident.png'
    },
    venti: {
      name: 'Venti',
      title: 'Bard of Mondstadt',
      description: 'A cheerful bard with mysterious knowledge and cryptic songs.',
      avatar: '/avatars/Venti/Happy.png'
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border-4 border-amber-200">
        {/* Book Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            ×
          </button>
          <h2 className="text-2xl font-bold flex items-center">
            📖 Character Information Book
          </h2>
          <p className="text-amber-100 mt-2">Information you've gathered so far</p>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Character List */}
          <div className="w-1/3 bg-amber-100 border-r-2 border-amber-200 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-semibold text-amber-800 mb-4">Characters Met</h3>
              {encounteredCharacters.length === 0 ? (
                <p className="text-amber-600 italic">No characters encountered yet</p>
              ) : (
                <div className="space-y-2">
                  {encounteredCharacters.map(character => {
                    const data = characterData[character as keyof typeof characterData];
                    if (!data) return null;
                    
                    return (
                      <button
                        key={character}
                        onClick={() => setSelectedCharacter(character)}
                        className={`w-full p-3 rounded-lg text-left transition-all ${
                          selectedCharacter === character
                            ? 'bg-amber-600 text-white shadow-md'
                            : 'bg-white hover:bg-amber-200 text-amber-800'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-white/20">
                            <Image
                              src={data.avatar}
                              alt={data.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="font-medium">{data.name}</div>
                            <div className="text-xs opacity-75">{data.title}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Character Details */}
          <div className="flex-1 overflow-y-auto">
            {selectedCharacter ? (
              <div className="p-6">
                {(() => {
                  const data = characterData[selectedCharacter as keyof typeof characterData];
                  const info = characterInformation[selectedCharacter] || [];
                  
                  return (
                    <div>
                      {/* Character Header */}
                      <div className="flex items-start space-x-4 mb-6">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-amber-200">
                          <Image
                            src={data.avatar}
                            alt={data.name}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-amber-800">{data.name}</h3>
                          <p className="text-amber-600 font-medium">{data.title}</p>
                          <p className="text-amber-700 mt-2">{data.description}</p>
                        </div>
                      </div>

                      {/* Information Gathered */}
                      <div className="bg-white rounded-lg p-4 shadow-inner">
                        <h4 className="font-semibold text-amber-800 mb-3 flex items-center">
                          📝 Information Gathered
                        </h4>
                        {info.length === 0 ? (
                          <p className="text-amber-600 italic">No information gathered yet. Have deeper conversations to learn more!</p>
                        ) : (
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {info.map((item, index) => (
                              <div key={index} className="bg-amber-50 p-3 rounded border-l-4 border-amber-400">
                                <p className="text-amber-800 leading-relaxed">"{item}"</p>
                              </div>
                            ))}
                            <div className="text-xs text-amber-600 italic mt-4 pt-3 border-t border-amber-200">
                              💡 All dialogue from your conversations with {data.name}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-amber-600">
                  <div className="text-4xl mb-4">📚</div>
                  <p className="text-lg">Select a character to view their information</p>
                  <p className="text-sm mt-2 opacity-75">
                    Have conversations with characters to gather more details about them
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
