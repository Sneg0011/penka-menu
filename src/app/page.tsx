import { MenuScreen } from "@/components/MenuScreen";
import { PhoneFrame } from "@/components/PhoneFrame";
import { PourBackground } from "@/motion/PourBackground";

// Меню кофейни: на телефоне — обычная страница, с компьютера — телефон по центру экрана.
// Фон разделов с переливом между ними — общий слой под меню (PourBackground).
export default function Home() {
  return (
    <PhoneFrame backdrop={<PourBackground />}>
      <MenuScreen />
    </PhoneFrame>
  );
}
