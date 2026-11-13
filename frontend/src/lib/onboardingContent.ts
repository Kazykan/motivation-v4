export interface OnboardingSlideData {
  src: string
  alt: string
  title: string
  subtitle: string
}

export const ONBOARDING_SLIDES: OnboardingSlideData[] = [
  {
    src: "/illustrations/onboarding-1.png",
    alt: "Родитель и ребёнок за столом договариваются",
    title: "Договор, а не нотации",
    subtitle: "Родитель и ребёнок договариваются о цене работы. Без криков и напоминаний.",
  },
  {
    src: "/illustrations/onboarding-2.png",
    alt: "Ребёнок выбирает между двумя стопками предметов",
    title: "Цена важного — выше",
    subtitle: "Каждое задание имеет недельную стоимость. Хочешь, чтобы сделали — поставь цену.",
  },
  {
    src: "/illustrations/onboarding-3.png",
    alt: "Ребёнок отмечает день в блокноте-планировщике",
    title: "Один клик — один день",
    subtitle: "Ребёнок отмечает выполнение сам. Родитель проверяет поштучно.",
  },
  {
    src: "/illustrations/onboarding-4.png",
    alt: "Родитель подтверждает выполнение в телефоне",
    title: "Родитель подтверждает",
    subtitle: "Приложение считает. Платит родитель — реальными деньгами, раз в неделю.",
  },
  {
    src: "/illustrations/onboarding-5.png",
    alt: "Родитель передаёт ребёнку конверт с выплатой",
    title: "Неделя закрыта — деньги у тебя",
    subtitle: "Прозрачная история: что сделано, что проверено, что выплачено.",
  },
]

export const ONBOARDING_STORAGE_KEY = "onboarding_seen_v1"
