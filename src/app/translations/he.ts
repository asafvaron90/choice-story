import { Translation } from "./types";
import { PageType } from "@/models";

export const heTranslations: Translation = {
  nav: {
    contact: "צור קשר",
    benefits: "יתרונות",
    about: "אודות",
    createStory: "צור סיפור",
    signIn: "התחבר",
    signOut: "התנתק",
    dashboard: "לוח בקרה",
    account: "חשבון"
  },
  hero: {
    title: "צור סיפורים מותאמים אישית",
    subtitle: "יצירת סיפורים בעזרת בינה מלאכותית",
    description: "צור סיפורים ייחודיים המותאמים לצרכי ילדך",
    detailedText1: "הטכנולוגיה שלנו מייצרת סיפורים מותאמים אישית שעוזרים לילדים ללמוד ולצמוח",
    detailedText2: "כל סיפור הוא ייחודי ומותאם לצרכים הספציפיים של ילדך"
  },
  story: {
    title: "סיפור",
    description: "תיאור",
    readStory: "קרא סיפור"
  },
  benefits: {
    title: "יתרונות",
    items: [
      "סיפורים מותאמים אישית לילד שלך",
      "יצירת סיפורים בעזרת בינה מלאכותית",
      "תוכן חינוכי",
      "כיף ומעניין"
    ]
  },
  contact: {
    title: "דברו איתנו",
    subtitle: "צור קשר"
  },
  createKid: {
    title: "יצירת פרופיל ילד",
    error: {
      incomplete: "נא למלא את כל השדות הנדרשים ולוודא שהתמונה נותחה",
      saveFailed: "שמירת פרופיל הילד נכשלה. נא לנסות שוב."
    },
    success: {
      created: "פרופיל הילד נוצר בהצלחה!",
      redirecting: "מעביר ללוח הבקרה...",
      saved: "פרופיל הילד נשמר בהצלחה.",
      saving: "שומר..."
    }
  },
  createStory: {
    progress: {
      problemDescription: "הבעיה שאנחנו רוצים לפתור",
      selectTitle: "בחירת כותרת",
      generateCover: "יצירת תמונת שער",
      generateChoices: "יצירת תמונות בחירה",
      finishStory: "סיום הסיפור"
    },
    kidDetails: {
      title: "בואו נתחיל! ספרו לנו על הילד שלכם",
      nameLabel: "שם הילד (שם פרטי בלבד)",
      ageLabel: "גיל",
      genderLabel: "מגדר",
      male: "זכר",
      female: "נקבה",
      continue: "המשך",
    },
    imageUpload: {
      title: "העלו תמונה של הילד",
      uploadButton: "העלאת תמונה",
      instructions: {
        title: "איך לצלם תמונה מושלמת?",
        description: "בחרו תמונה ברורה של הילד/ה במרכז התמונה",
      },
      validation: {
        needsAdjustment: "התמונה דורשת התאמות",
        analysisError: "נכשל בניתוח דרישות התמונה",
        tryAgain: "אנא נסו להעלות את התמונה שוב",
        matchesRequirement: "תואם לדרישה",
        doesntMatch: "לא תואם",
        confidence: "רמת ביטחון",
      },
      progress: {
        initializing: "מאתחל יצירת אווטאר...",
        processing: "מעבד את התמונה שלך...",
        creating: "יוצר מאפייני פיקסאר...",
        finalizing: "כמעט שם! מסיים את האווטארים שלך...",
        analyzing: "מנתח את התמונה...",
        uploading: "מעלה תמונה...",
        saving: "שומר...",
      },
      examples: {
        title: "דוגמאות לתמונות",
        description: "הנה כמה דוגמאות לתמונות טובות:",
        perfectPhoto: {
          title: "צילום ישר וברור",
          description: "מושלם! זה מה שאנחנו צריכים",
        },
        tiltedHead: {
          title: "ראש טיפה מעלה",
          description: "הראש מוטה - לא טוב",
        },
        coveredFace: {
          title: "פנים מכוסות",
          description: "פנים מוסתרות או מכוסות",
        },
      },
      continue: "המשך",
    },
    problemDescription: {
      title: "הבעיה שאנחנו רוצים לפתור",
      description: "ספרו לנו על המצב או ההתנהגות שברצונכם לטפל בה",
      generateButton: "יצירת רעיונות לסיפור",
      selectTitle: "בחירת כותרת",
      placeholder: "{name} לא אוהב/ת לצחצח שיניים",
      verificationError: "נכשל באימות תיאור הבעיה. אנא נסו שוב.",
      continue: "המשך",
    },
    choices: {
      title: "בואו ניצור סיפור עם קצת קסם!",
      bookTitle: "בחרו את כותרת הספר:",
      regenerateTitle: "יצירת כותרות חדשות",
      goodChoice: "בחירה טובה:",
      badChoice: "בחירה רעה:",
      editHint: "אתם מוזמנים לערוך את הבחירות כדי להתאים אותן באופן אישי יותר.",
      continue: "המשך",
      generateButton: "יצירת בחירות",
    },
    preview: {
      title: "תצוגה מקדימה של הסיפור שלכם",
      coverImages: "תמונות שער",
      generating: "מייצר...",
      regenerate: "יצירה מחדש",
      saving: "שומר סיפור...",
      finish: "סיום הסיפור",
    },
  },
  dashboard: {
    title: "הילדים שלי",
    addKid: "הוסף ילד",
    noKids: "לא נמצאו ילדים. הוסף ילד כדי להתחיל!",
    tryAgain: "נסה שוב",
    refreshing: "מרענן..."
  },
  userCard: {
    imageAnalysisDialog: {
      title: "ניתוח תמונה עבור {name}",
      description: "בדוק את הניתוח שנוצר על ידי AI של תמונת הפרופיל",
      resultsTitle: "תוצאות הניתוח:",
      noAnalysis: "אין ניתוח זמין",
      analyzing: "מנתח...",
      reanalyze: "נתח מחדש את התמונה",
      createAvatar: "צור אווטאר",
      generatingAvatar: "יוצר אווטאר...",
      generatedAvatars: "אווטארים זמינים שנוצרו",
      avatarGenerationFailed: "יצירת האווטאר נכשלה",
      selectAvatar: "בחר אווטאר",
      avatarSelected: "אווטאר נבחר",
      currentAvatar: "נוכחי",
      originalImage: "תמונה מקורית",
      selectedAvatar: "אווטאר נבחר כרגע",
    },
    toasts: {
      analysisCompleteTitle: "הניתוח הושלם",
      analysisCompleteDescription: "ניתוח התמונה עודכן בהצלחה.",
      analysisFailedTitle: "הניתוח נכשל",
      deleteSuccessTitle: "הצלחה",
      deleteSuccessDescription: "{name} נמחק בהצלחה.",
      deleteErrorTitle: "שגיאה",
      deleteErrorDescription: "מחיקת הילד נכשלה. אנא נסה שוב.",
      avatarSelectedTitle: "אווטאר נבחר",
      avatarSelectedDescription: "אווטאר חדש הוגדר בהצלחה",
      avatarSelectionFailedTitle: "הבחירה נכשלה",
    },
    deleteConfirmation: "האם אתה בטוח שברצונך למחוק את {name}?",
    unnamedKid: "ילד ללא שם",
    years: "שנים",
    stories: "סיפורים",
    createStory: "צור סיפור",
    delete: "מחק",
    storiesTitle: "סיפורים",
    refreshStories: "רענן סיפורים",
    noStoriesFound: "לא נמצאו סיפורים. לחץ לטעינה מחדש.",
    noStoriesYet: "אין עדיין סיפורים",
    deleteStory: "מחק סיפור",
    userNotAuthenticated: "המשתמש אינו מאומת",
    failedToDeleteKid: "נכשל במחיקת הילד",
    generateStory: "יצירת סיפור",
    male: "זכר",
    female: "נקבה",
  },
  quickGenerateDialog: {
    generateStory: "יצירת סיפור",
    title: "יצירת סיפור",
    description: "הזן בעיה ליצירת סיפור חדש",
    problemLabel: "בעיית הסיפור",
    problemPlaceholder: "תאר בעיה לסיפור",
    advantagesLabel: "יתרונות",
    advantagesPlaceholder: "תאר יתרונות (אופציונלי)",
    disadvantagesLabel: "חסרונות",
    disadvantagesPlaceholder: "תאר חסרונות (אופציונלי)",
    inputRequiredTitle: "נדרש קלט",
    inputRequiredDescription: "אנא הזן בעיה לסיפור",
    progressDialog: {
      title: "יוצר סיפור",
      description: "זה עשוי לקחת מספר דקות. אנא אל תסגור חלון זה.",
      message: "אנחנו יוצרים עבורך סיפור ייחודי עם תמונות.",
      subtext1: "תהליך זה נמשך בדרך כלל 2-3 דקות.",
      subtext2: "אנחנו יוצרים עבורך סיפור ייחודי עם תמונות.",
      storyCompleted: "הסיפור הושלם!",
    },
  },
  storyPageCard: {
    title: (type: PageType) => {
      switch (type) {
        case PageType.COVER:
          return 'עמוד שער';
        case PageType.NORMAL:
          return 'עמוד רגיל';
        case PageType.GOOD_CHOICE:
          return 'בחירה טובה';
        case PageType.BAD_CHOICE:
          return 'בחירה רעה';
        case PageType.GOOD:
          return 'עמוד טוב';
        case PageType.BAD:
          return 'עמוד רע';
        default:
          return String(type);
      }
    }
  },
}; 