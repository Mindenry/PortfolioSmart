interface Translations {
    [key: string]: {
      [key: string]: string;
    };
  }
  
  export const translations: Translations = {
    en: {
      "settings.profile": "Profile Settings",
      "settings.preferences": "Preferences",
      "settings.notifications": "Notifications",
      "settings.profile.info": "Profile Information",
      "settings.username": "Username",
      "settings.email": "Email",
      "settings.theme": "Theme",
      "settings.language": "Language",
      "settings.notifications.email": "Email Notifications",
      "settings.notifications.description": "Receive email notifications about updates and activities",
      "settings.save": "Save all changes",
      "settings.saving": "Saving changes...",
      "settings.theme.light": "Light",
      "settings.theme.dark": "Dark",
      "settings.language.en": "English",
      "settings.language.th": "ไทย",
    },
    th: {
      "settings.profile": "ตั้งค่าโปรไฟล์",
      "settings.preferences": "การตั้งค่า",
      "settings.notifications": "การแจ้งเตือน",
      "settings.profile.info": "ข้อมูลโปรไฟล์",
      "settings.username": "ชื่อผู้ใช้",
      "settings.email": "อีเมล",
      "settings.theme": "ธีม",
      "settings.language": "ภาษา",
      "settings.notifications.email": "การแจ้งเตือนทางอีเมล",
      "settings.notifications.description": "รับการแจ้งเตือนทางอีเมลเกี่ยวกับการอัปเดตและกิจกรรม",
      "settings.save": "บันทึกการเปลี่ยนแปลงทั้งหมด",
      "settings.saving": "กำลังบันทึกการเปลี่ยนแปลง...",
      "settings.theme.light": "สว่าง",
      "settings.theme.dark": "มืด",
      "settings.language.en": "English",
      "settings.language.th": "ไทย",
    }
};

export const useTranslation = (language: string) => {
  return (key: string): string => {
    return translations[language]?.[key] || translations['en'][key] || key;
  };
};