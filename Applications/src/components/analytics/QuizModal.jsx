import React, { useState } from 'react';

const QuizModal = ({ isOpen, onClose, quizData, isDarkMode, onSaveToNote, noteTitle }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!isOpen || !quizData || quizData.length === 0) return null;

  const currentCard = quizData[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => Math.min(prev + 1, quizData.length - 1)), 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => Math.max(prev - 1, 0)), 150);
  };

  const handleSave = () => {
    onSaveToNote(quizData, noteTitle);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className={`w-full max-w-2xl p-6 rounded-2xl border shadow-2xl flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <i className="fas fa-wand-magic-sparkles text-purple-500"></i>
            AI Quiz Practice
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Flashcard Area */}
        <div className="relative w-full h-64 perspective-1000 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
          <div className={`w-full h-full transition-transform duration-500 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
            
            {/* Front (Question) */}
            <div className={`absolute w-full h-full backface-hidden rounded-xl border-2 flex items-center justify-center p-8 text-center shadow-md ${isDarkMode ? 'bg-slate-800 border-blue-500/50 text-white' : 'bg-blue-50 border-blue-200 text-gray-900'}`}>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-2 block">Question {currentIndex + 1} of {quizData.length}</span>
                <p className="text-xl font-medium">{currentCard.question}</p>
                <p className="text-xs text-gray-500 mt-6"><i className="fas fa-hand-pointer mr-1"></i> Click to reveal answer</p>
              </div>
            </div>

            {/* Back (Answer) */}
            <div className={`absolute w-full h-full backface-hidden rotate-y-180 rounded-xl border-2 flex items-center justify-center p-8 text-center shadow-md ${isDarkMode ? 'bg-slate-800 border-emerald-500/50 text-white' : 'bg-emerald-50 border-emerald-200 text-gray-900'}`}>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-500 mb-2 block">Answer</span>
                <p className="text-xl font-medium">{currentCard.answer}</p>
              </div>
            </div>

          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center mt-8">
          <button 
            onClick={handlePrev} 
            disabled={currentIndex === 0}
            className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <i className="fas fa-chevron-left mr-2"></i> Prev
          </button>
          
          <button 
            onClick={handleSave} 
            className="px-4 py-2 rounded-lg font-bold transition-colors bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50"
          >
            <i className="fas fa-save mr-2"></i> Save to Note
          </button>

          <button 
            onClick={handleNext} 
            disabled={currentIndex === quizData.length - 1}
            className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Next <i className="fas fa-chevron-right ml-2"></i>
          </button>
        </div>

      </div>
    </div>
  );
};

export default QuizModal;
