import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function AgbPage() {
  return (
    <div className="relative min-h-screen" style={{ background: '#030303' }}>
      <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden="true">
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-lime-500/40 blur-[180px]" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-10">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">Rechtliches</p>
          <h1 className="mt-2 text-3xl font-semibold">Allgemeine Geschäftsbedingungen</h1>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-lime-300 hover:text-lime-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Startseite
        </Link>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-20">
        <article className="legal-content rounded-3xl border border-white/10 bg-white/5 p-10 text-sm">
          <section>
            <h2>1. Geltungsbereich</h2>
            <p><strong>1.1</strong> Diese Allgemeinen Geschäftsbedingungen regeln das Vertragsverhältnis zwischen dir und der EcomTree GmbH, Mergenthalerallee 73-75, 65760 Eschborn (nachfolgend „wir" oder „Sculpt"), für die Nutzung der App „Sculpt Gym Tracker" sowie aller damit verbundenen Leistungen.</p>
            <p><strong>1.2</strong> Die Vertrags- und Kommunikationssprache ist Deutsch. Etwaige Übersetzungen dienen ausschließlich der Information. Bei Abweichungen ist die deutsche Fassung maßgeblich.</p>
            <p><strong>1.3</strong> Von diesen AGB abweichende Bedingungen finden keine Anwendung, es sei denn, wir stimmen ihnen schriftlich zu.</p>
          </section>

          <section>
            <h2>2. Vertragsgegenstand und Vertragsschluss</h2>
            <p><strong>2.1</strong> Um Sculpt zu nutzen, musst du ein Nutzerkonto erstellen. Die Registrierung ist über unsere Website, über Vertriebspartner oder direkt in der App möglich. Im Rahmen der Registrierung wirst du aufgefordert, diesen AGB sowie der Datenschutzerklärung zuzustimmen.</p>
            <p><strong>2.2</strong> Du kannst Sculpt über unsere Website, über Drittplattformen (z.&nbsp;B. Digistore24) sowie über die App Stores von Apple und Google beziehen. Der Nutzungsvertrag kommt zustande, sobald du den Kauf- oder Aktivierungsprozess abschließt (z.&nbsp;B. durch Klicken auf „Zahlung bestätigen", „Jetzt kaufen" oder eine vergleichbare Schaltfläche) und – sofern erforderlich – deinen App-Store-Zugang bestätigst.</p>
            <p><strong>2.3</strong> Zusätzlich gelten die Allgemeinen Geschäftsbedingungen der jeweiligen Plattform, über die du Sculpt beziehst. Bei Widersprüchen haben die Bestimmungen dieser AGB Vorrang, soweit sie der Plattformbetreiber nicht ausschließt.</p>
          </section>

          <section>
            <h2>3. Trainings-, Ernährungs- und Gesundheitshinweise</h2>
            <p><strong>3.1</strong> Die Nutzung von Sculpt erfolgt auf eigenes Risiko. Die App ersetzt keine ärztliche Beratung, Diagnose oder Behandlung. Wir unterstützen dich mit Trainings-, Ernährungs- und Regenerationsempfehlungen und stellen dir Funktionen zur Dokumentation deines Fortschritts bereit. Voraussetzung für die Nutzung ist ein guter allgemeiner Gesundheitszustand.</p>
            <p><strong>3.2</strong> Hol dir medizinischen Rat, bevor du mit einem Trainings- oder Ernährungsplan beginnst oder wenn währenddessen Beschwerden auftreten. Schwangere oder stillende Personen sollten unsere Programme nicht nutzen.</p>
            <p><strong>3.3</strong> Unsere Angebote richten sich ausschließlich an gesunde Erwachsene. Nutze Sculpt nicht, wenn Erkrankungen vorliegen, die durch Training oder Ernährung beeinflusst werden könnten.</p>
            <p><strong>3.4</strong> Unsere Empfehlungen basieren auf aktuellen sport- und ernährungswissenschaftlichen Erkenntnissen. Wir übernehmen jedoch keine Gewähr dafür, dass sie jederzeit dem neuesten Stand entsprechen.</p>
            <p><strong>3.5</strong> Für die vollständige Nutzung benötigst du ggf. Trainingsgeräte oder Hilfsmittel. Du bist verantwortlich dafür, nur intakte und geeignete Geräte zu verwenden.</p>
          </section>

          <section>
            <h2>4. Nutzungsrechte</h2>
            <p><strong>4.1</strong> Sämtliche Inhalte von Sculpt sind urheberrechtlich geschützt. Wir räumen dir ein einfaches, nicht übertragbares, auf die Vertragslaufzeit beschränktes Nutzungsrecht ein, die App zu installieren und gemäß diesen AGB zu verwenden.</p>
            <p><strong>4.2</strong> Es ist dir untersagt, Sculpt zu verändern, zu dekompilieren, Reverse Engineering durchzuführen, Schutzmechanismen zu umgehen oder Dritte damit zu beauftragen. Ausnahmen gelten nur im gesetzlich zwingenden Rahmen (§ 69e UrhG).</p>
            <p><strong>4.3</strong> Eine Nutzung über den Vertragsumfang hinaus, eine Weitergabe an Dritte oder das Erstellen vollständiger oder teilweiser Kopien ohne unsere Zustimmung ist nicht gestattet.</p>
            <p><strong>4.4</strong> Das Reproduzieren, Verkaufen oder temporäre Überlassen von Sculpt oder Teilen davon bedarf unserer schriftlichen Zustimmung. Eine zulässige Sicherungskopie muss als solche gekennzeichnet werden.</p>
            <p><strong>4.5</strong> Eine Übertragung der Nutzungsrechte auf Dritte ist nicht erlaubt.</p>
          </section>

          <section>
            <h2>5. Pflichten der Nutzer</h2>
            <p><strong>5.1</strong> Du bist verpflichtet, Zugangsdaten und Geräte vor unbefugtem Zugriff zu schützen und nicht an Dritte weiterzugeben.</p>
            <p><strong>5.2</strong> Urheber-, Marken- oder sonstige Schutzvermerke dürfen nicht entfernt oder verändert werden und müssen in Kopien vollständig übernommen werden.</p>
            <p><strong>5.3</strong> Eine missbräuchliche Nutzung von Sculpt, insbesondere für rechtswidrige Inhalte oder Handlungen, ist untersagt.</p>
            <p><strong>5.4</strong> Verwende in Sculpt keine Inhalte, an denen Dritte Schutzrechte halten, sofern dir keine entsprechende Nutzungserlaubnis vorliegt.</p>
            <p><strong>5.5</strong> Du stellst uns von Ansprüchen Dritter frei, die auf deiner rechtswidrigen Nutzung beruhen, und übernimmst die Kosten der Rechtsverteidigung sowie sämtliche daraus entstehenden Schäden.</p>
            <p><strong>5.6</strong> Bei Verstößen gegen diese Pflichten können wir deinen Zugang sperren, bis der Verstoß beseitigt ist und du eine entsprechende Unterlassungserklärung abgegeben hast.</p>
          </section>

          <section>
            <h2>6. Zahlungsbedingungen</h2>
            <p><strong>6.1</strong> Preise und Zahlungsmodalitäten ergeben sich aus dem jeweiligen Angebot im App-Store, auf der Plattform des Vertriebspartners oder auf unserer Website. Die Preise verstehen sich inklusive der gesetzlichen Umsatzsteuer.</p>
            <p><strong>6.2</strong> Kann ein fälliger Betrag nicht eingezogen werden, bist du verpflichtet, die dadurch entstehenden Kosten zu tragen. Weitere Ansprüche wegen Zahlungsverzugs behalten wir uns vor.</p>
          </section>

          <section>
            <h2>7. Laufzeit und Kündigung</h2>
            <p><strong>7.1</strong> Kostenpflichtige Abonnements laufen mindestens für die von dir gewählte Laufzeit und verlängern sich automatisch, wenn sie nicht innerhalb der im Angebot genannten Frist (in der Regel 24 Stunden vor Ablauf) gekündigt werden. Nach einer Verlängerung kannst du jederzeit mit einer Frist von einem Monat kündigen. Die Kündigung erfolgt über die Plattform, über die das Abonnement abgeschlossen wurde (z.&nbsp;B. App-Store-Einstellungen, Digistore24-Konto, Kundenbereich auf unserer Website).</p>
            <p><strong>7.2</strong> Für außerhalb Deutschlands ansässige Nutzer:innen oder Unternehmenskunden gelten die Verlängerungsbedingungen des gewählten Angebots. Die Kündigung erfolgt ebenfalls über die jeweilige Plattform.</p>
            <p><strong>7.3</strong> Wir können den Vertrag mit einer Frist von zwei Wochen kündigen, frühestens zum Ende der Mindestlaufzeit oder des Verlängerungszeitraums.</p>
          </section>

          <section>
            <h2>8. Widerrufsrecht</h2>
            <p>Wenn dir gesetzlich ein Widerrufsrecht zusteht (z.&nbsp;B. als Verbraucherin oder Verbraucher in der EU), informieren wir dich im Anhang über die Ausübung und Folgen des Widerrufs. In App Stores gelten ergänzend die dortigen Bedingungen. Beachte, dass das Widerrufsrecht erlischt, wenn wir mit deiner ausdrücklichen Zustimmung mit der Leistungserbringung vor Ablauf der Widerrufsfrist begonnen haben.</p>
          </section>

          <section>
            <h2>9. Mängelhaftung</h2>
            <p><strong>9.1</strong> Es gelten die gesetzlichen Bestimmungen zur Mängelhaftung. Deine Verbraucherrechte bleiben unberührt.</p>
            <p><strong>9.2</strong> Wir garantieren keinen bestimmten Trainings-, Gesundheits- oder Körpererfolg. Ergebnisse hängen von individuellen Faktoren ab und können daher variieren.</p>
          </section>

          <section>
            <h2>10. Haftung</h2>
            <p><strong>10.1</strong> Wir haften unbeschränkt für Schäden, die wir vorsätzlich oder grob fahrlässig verursachen, sowie bei Verletzung von Leben, Körper oder Gesundheit.</p>
            <p><strong>10.2</strong> Bei einfacher Fahrlässigkeit haften wir nur für die Verletzung wesentlicher Vertragspflichten; in diesem Fall ist die Haftung auf den typischerweise vorhersehbaren Schaden begrenzt.</p>
            <p><strong>10.3</strong> Die Haftungsbeschränkungen gelten auch für unsere Erfüllungs- und Verrichtungsgehilfen. Gesetzliche Ansprüche, etwa nach dem Produkthaftungsgesetz oder bei abgegebenen Garantien, bleiben unberührt.</p>
          </section>

          <section>
            <h2>11. Änderungen der AGB</h2>
            <p>Wir dürfen diese AGB ändern, wenn sachliche Gründe vorliegen (z.&nbsp;B. Gesetzesänderungen, neue technische Anforderungen) und die Anpassung für dich zumutbar ist. Über geplante Änderungen informieren wir dich mindestens vier Wochen vor Inkrafttreten. Widersprichst du nicht innerhalb dieser Frist und nutzt Sculpt weiter, gelten die neuen Bedingungen als angenommen. Bei Widerspruch können wir den Vertrag fristgerecht kündigen.</p>
          </section>

          <section>
            <h2>12. Online-Streitbeilegung und Verbraucherschlichtung</h2>
            <p>Die Europäische Kommission stellt unter <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noreferrer">https://ec.europa.eu/consumers/odr/</a> eine Plattform zur Online-Streitbeilegung bereit. Wir sind nicht verpflichtet und in der Regel nicht bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen. Unsere E-Mail-Adresse findest du im Impressum.</p>
          </section>

          <section>
            <h2>13. Schlussbestimmungen</h2>
            <p><strong>13.1</strong> Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Bei Verbraucher:innen innerhalb der EU können zwingende Verbraucherschutzvorschriften des Wohnsitzstaates Anwendung finden.</p>
            <p><strong>13.2</strong> Falls du keinen allgemeinen Gerichtsstand in Deutschland oder der EU hast oder deinen Wohnsitz nach Vertragsabschluss außerhalb der EU verlegst, ist Eschborn unser ausschließlicher Gerichtsstand.</p>
            <p><strong>13.3</strong> Vertragssprache ist Deutsch.</p>
            <p><strong>13.4</strong> Sollten einzelne Bestimmungen unwirksam sein, bleibt der Vertrag im Übrigen wirksam.</p>
          </section>

          <section>
            <h2>Anhang: Widerrufsbelehrung</h2>
            <h3>Widerrufsrecht</h3>
            <p>Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Frist beginnt mit Vertragsschluss.</p>
            <p>Um dein Widerrufsrecht auszuüben, musst du uns (EcomTree GmbH, Mergenthalerallee 73-75, 65760 Eschborn, E-Mail: support@sculpt.app) mittels einer eindeutigen Erklärung (z.&nbsp;B. Brief oder E-Mail) über deinen Entschluss informieren. Du kannst dafür das nachfolgende Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist. Zur Wahrung der Frist reicht es aus, dass du die Mitteilung vor Ablauf der Widerrufsfrist absendest.</p>
            <h3>Folgen des Widerrufs</h3>
            <p>Wenn du den Vertrag widerrufst, erstatten wir alle Zahlungen unverzüglich und spätestens binnen vierzehn Tagen nach Eingang deiner Widerrufserklärung. Für die Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du eingesetzt hast, es sei denn, es wurde etwas anderes vereinbart. Dir entstehen dadurch keine Entgelte.</p>
            <p>Das Widerrufsrecht erlischt, wenn wir die Leistung vollständig erbracht haben, nachdem du ausdrücklich zugestimmt hast, dass wir vor Ablauf der Widerrufsfrist mit der Vertragserfüllung beginnen, und du deine Kenntnis bestätigt hast, dass du dadurch dein Widerrufsrecht verlierst.</p>
            <h3>Muster-Widerrufsformular</h3>
            <p>Wenn du den Vertrag widerrufen willst, fülle bitte dieses Formular aus und sende es an support@sculpt.app oder postalisch an die EcomTree GmbH.</p>
            <ul>
              <li>Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*)/die Erbringung der folgenden Dienstleistung (*):</li>
              <li>Bestellt am (*)/erhalten am (*):</li>
              <li>Name des/der Verbraucher(s):</li>
              <li>Anschrift des/der Verbraucher(s):</li>
              <li>Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier):</li>
              <li>Datum:</li>
            </ul>
            <p>(*) Unzutreffendes streichen.</p>
          </section>
        </article>
      </main>
    </div>
  )
}
