# 1. Introducere

## 1.1 Descrierea problemei

Digitalizarea accelerată a mediului educațional, amplificată semnificativ de contextul pandemiei din 2020–2021, a determinat o schimbare de paradigmă în modul în care cursurile universitare sunt predate și evaluate. Dacă anterior platformele de e-learning erau considerate un complement facultativ al educației tradiționale, astăzi ele reprezintă o componentă esențială a infrastructurii academice moderne. Această tranziție vine însă cu provocări tehnice și pedagogice specifice, în special în domeniul informaticii, unde predarea eficientă a programării necesită mai mult decât simpla livrare de conținut text sau video.

Predarea programării ridică o serie de dificultăți care nu se regăsesc în alte discipline. În primul rând, înțelegerea conceptelor de programare este inseparabilă de practica efectivă — un student nu poate înțelege cu adevărat recursivitatea sau structurile de date fără a scrie și rula cod în mod repetat. Platformele educaționale generale nu sunt echipate pentru a oferi această experiență interactivă. În al doilea rând, evaluarea automată a soluțiilor de cod este o problemă complexă: o soluție corectă din punct de vedere funcțional poate fi ineficientă, iar detectarea similitudinilor dintre soluțiile studenților — plagiatul — este practic imposibil de realizat manual la o cohortă de zeci sau sute de studenți.

Din perspectiva profesorilor, gestionarea unui curs de programare cu zeci sau sute de studenți implică provocări logistice considerabile: organizarea materialelor de curs pe capitole și lecții, urmărirea progresului individual, identificarea exercițiilor care cauzează dificultăți generalizate și comunicarea eficientă cu studenții. Fără instrumente dedicate, aceste sarcini consumă o cantitate disproporționată de timp și reduc calitatea actului didactic.

Lucrarea de față prezintă proiectarea și implementarea unei platforme web interactive pentru predarea și învățarea programării, care adresează simultan nevoile studenților și ale profesorilor printr-un sistem integrat: conținut de curs structurat, exerciții interactive cu feedback imediat, sugestii generate de inteligență artificială, analitica clasei și detecție automată a plagiatului.

## 1.2 Originea numelui aplicației — Note G

Numele aplicației, *Note G*, este o referință directă la unul dintre cele mai importante documente din istoria informaticii. În 1843, matematiciana britanică Ada Lovelace a tradus în engleză articolul italianului Luigi Menabrea despre Motorul Analitic al lui Charles Babbage, adăugând o serie de note proprii, notate de la A la G. *Nota G*, ultima și cea mai extinsă dintre acestea, conținea un algoritm detaliat pentru calculul numerelor Bernoulli folosind Motorul Analitic — considerat astăzi primul program de calculator din istorie [1].

Alegerea acestui nume pentru o platformă educațională dedicată programării nu este întâmplătoare. Ada Lovelace a înțeles, cu aproape două secole înaintea erei digitale, că mașinile de calcul pot fi instruite să execute orice algoritm exprimabil matematic — o viziune care stă la baza întregii informatici moderne. Prin denumirea *Note G*, aplicația își propune să evoce spiritul de curiozitate și rigurozitate asociat primelor contribuții la programare, poziționându-se ca un spațiu în care studenții pot descoperi și exersa această disciplină cu aceeași determinare.

Simbolic, *Nota G* a lui Ada Lovelace a rămas multă vreme nerecunoscută, contribuția ei nefiind pe deplin apreciată de contemporani. La fel, mulți studenți din ziua de astăzi descoperă programarea fără o îndrumare structurată și fără instrumentele potrivite — o lacună pe care platforma *Note G* și-o propune să o adreseze.

## 1.3 Funcțiile de bază ale unei aplicații tipice pentru problema aleasă

O platformă educativă dedicată predării programării trebuie să ofere un set coerent de funcționalități care să acopere întregul ciclu didactic: de la crearea și structurarea conținutului, până la evaluare și feedback.

**Gestionarea utilizatorilor și autentificarea.** Orice platformă multi-utilizator necesită un sistem robust de autentificare și autorizare. Aceasta presupune înregistrarea conturilor pe baza adresei de e-mail, verificarea identității prin confirmare prin e-mail, mecanisme de recuperare a parolei și separarea clară a rolurilor — profesor și student. Securizarea sesiunilor se realizează prin token-uri JWT (*JSON Web Tokens*), iar datele sensibile sunt stocate criptat în baza de date.

**Crearea și organizarea conținutului de curs.** Profesorii trebuie să poată structura materialul didactic în mod ierarhic: cursuri formate din capitole, iar capitolele din lecții individuale. O lecție poate conține text îmbogățit (cu formatare, imagini și cod evidențiat sintactic), materiale video sau prezentări PowerPoint. Flexibilitatea în tipurile de conținut suportate este esențială pentru a acoperi stilurile diferite de predare.

**Exerciții interactive cu evaluare automată.** Componenta centrală a unei platforme de predare a programării este mediul de rezolvare a exercițiilor. Studenții trebuie să poată scrie cod direct în browser, să ruleze soluția împotriva unui set de teste definite de profesor și să primească feedback instant — cazuri de test trecute sau nepromovate, mesaje de eroare și informații despre performanța codului. O funcționalitate valoroasă, posibilă prin integrarea cu modele de limbaj de mari dimensiuni, este oferirea de sugestii personalizate atunci când studentul este blocat — sugestii care ghidează fără a oferi direct soluția, promovând gândirea independentă.

**Gestionarea claselor și a înrolărilor.** Platforma trebuie să reflecte structura instituțională reală: ani de studiu, semigrupe și grupe, cu posibilitatea ca profesorii să asocieze cursuri unor clase specifice. Studenții se înrolează în cursuri, iar profesorii pot aproba sau respinge cererile de înrolare. Această structurare permite statistici relevante la nivelul clasei, nu doar la nivel individual.

**Analitica și monitorizarea progresului.** Profesorii trebuie să aibă acces la statistici agregate: rata de rezolvare per exercițiu, distribuția scorurilor, identificarea exercițiilor cu rata de eșec ridicată. Studenții, la rândul lor, pot monitoriza propriul progres — număr de exerciții rezolvate, scoruri obținute, istoricul tentativelor.

**Detecția plagiatului.** Evaluarea automată a codului creează riscul ca studenții să copieze soluțiile unii de la alții. Un sistem de detecție a plagiatului, bazat pe algoritmi de similaritate structurală a codului (independenți de redenumirea variabilelor sau de reformatare), este indispensabil pentru menținerea integrității academice.

**Notificări în timp real și calendar.** Comunicarea eficientă între profesor și studenți se realizează prin notificări (termene-limită, răspuns la cereri de înrolare, feedback la exerciții) livrate în timp real. Un calendar integrat oferă o vizualizare clară a evenimentelor cursului.

## 1.4 Soluții consacrate existente pe piață și motivația pentru o nouă platformă

Piața platformelor educaționale online este matură și diversificată. Analiza soluțiilor existente nu urmărește să le diminueze meritele, ci să identifice lacunele specifice predării programării la nivel universitar, lacune pe care aplicația *Note G* și-o propune să le adreseze.

### Moodle

Moodle (*Modular Object-Oriented Dynamic Learning Environment*) este cea mai utilizată platformă de e-learning open-source la nivel mondial, cu peste 300 de milioane de utilizatori conform datelor din 2023 [2]. Familiarizarea profesorilor cu Moodle este, fără îndoială, un avantaj care nu trebuie subestimat — există proceduri institutionale, suport tehnic dedicat și o comunitate vastă de utilizatori care au acumulat ani de experiență cu platforma.

Cu toate acestea, Moodle nu a fost proiectat cu predarea programării în minte. Integrarea exercițiilor de cod necesită plugin-uri terțe precum VPL (*Virtual Programming Lab*), a căror configurare este complexă, performanța este variabilă, iar experiența utilizatorului este net inferioară unui editor de cod modern. Nu există un flux nativ pentru sugestii generate de inteligență artificială, detecția plagiatului de cod necesită soluții externe suplimentare, iar interfața grafică, deși funcțională, este percepută de studenți ca greoaie comparativ cu aplicațiile web moderne [3].

Principalul motiv pentru care profesorii ar putea prefera *Note G* față de Moodle pentru cursurile de programare nu este abandonarea completă a Moodle — cele două pot coexista. *Note G* este specializat: oferă, nativ și fără configurare suplimentară, exact funcționalitățile de care un profesor de informatică are nevoie — editor de cod cu evaluare automată, sugestii AI, analitica claselor și rapoarte de plagiat. Efortul de configurare este minim față de adaptarea Moodle pentru același scop.

### Google Classroom

Google Classroom este o platformă educațională integrată în ecosistemul Google Workspace, apreciată pentru simplitatea ei și pentru integrarea cu Google Docs, Drive și Meet. Este răspândită în ciclul preuniversitar și în contextele în care instituția utilizează deja serviciile Google.

Limitele sale în predarea programării sunt fundamentale: nu există niciun mecanism de execuție a codului în browser, evaluarea exercițiilor de programare este complet manuală, iar gestionarea structurii instituționale (grupe, semigrupe, ani de studiu) nu este suportată. Google Classroom este, în esență, un sistem de distribuire și colectare a fișierelor — util, dar insuficient pentru specificul cursurilor de programare [4].

### Coursera și edX

Coursera și edX sunt platforme MOOC (*Massive Open Online Courses*) care găzduiesc cursuri de la universități și instituții de prestigiu mondial. Ambele includ suport pentru exerciții de programare evaluate automat și medii de dezvoltare în browser (Jupyter Notebooks, sandbox-uri Python). Calitatea conținutului este ridicată, iar experiența de utilizare este bine rafinată.

Limitele în contextul universitar local sunt de natură structurală: platforma este orientată spre cursuri publice globale, fără posibilitatea ca un profesor să creeze un curs privat accesibil doar studenților dintr-o anumită grupă. Nu există conceptul de clasă instituțională, gestionarea înrolărilor este automatizată la scală globală și nu există instrumente de detecție a plagiatului între studenții aceleiași cohorte [5]. Un profesor dintr-o universitate română nu poate pur și simplu crea un curs pe Coursera pentru studenții săi și să îl gestioneze ca pe un curs obișnuit.

### LeetCode și HackerRank

LeetCode și HackerRank sunt platforme specializate în exerciții de programare și pregătire pentru interviuri tehnice. Oferă un mediu avansat de execuție a codului, cu suport pentru zeci de limbaje de programare, și baze mari de probleme cu dificultăți variate. Sunt instrumente valoroase de exersare individuală și sunt larg recomandate studenților ca supliment al studiului.

Totuși, aceste platforme nu permit profesorilor să creeze materiale de predare proprii, să organizeze studenți în clase sau să urmărească progresul unei cohorte specifice. Nu există lecții, capitole sau structura unui curs — studentul are acces la o colecție de probleme, nu la un curriculum organizat. Detecția plagiatului între studenții aceluiași curs nu este disponibilă, întrucât platforma nu operează cu conceptul de „curs al unui profesor" [6].

### GitHub Classroom

GitHub Classroom este o soluție destinată predării programării care folosește repository-uri Git ca mecanism de distribuire și colectare a temelor. Este bine integrată în fluxul de lucru profesional al programatorilor și expune studenții de timpuriu la instrumentele industriei.

Dezavantajul major este bariera de intrare: utilizarea GitHub Classroom presupune o familiarizare prealabilă cu Git și GitHub, ceea ce reprezintă un obstacol semnificativ pentru studenții aflați la început de parcurs. Nu există un mediu de execuție a codului în browser, evaluarea automată depinde de pipeline-uri CI/CD configurate extern (GitHub Actions), iar configurarea este tehnic intensivă din perspectiva profesorului. Analitica clasei, notificările și calendarul lipsesc complet [7].

### De ce ar alege profesorii și studenții Note G?

Întrebarea legitimă este: de ce ar migra cineva de la o soluție consacrată la o platformă nouă? Răspunsul constă în costul de oportunitate. Un profesor care predă Algoritmi și Structuri de Date și utilizează Moodle pentru distribuirea materialelor trebuie, în prezent, fie să configureze și să întrețină un plugin VPL (efort tehnic considerabil), fie să gestioneze evaluarea exercițiilor manual (efort de timp considerabil), fie să redirecționeze studenții spre o platformă separată (LeetCode, HackerRank) pentru exerciții — pierzând astfel integrarea cu lista de studenți, structura clasei și statisticile centralizate.

*Note G* elimină această fragmentare. Profesorul creează cursul, organizează lecțiile, definește exercițiile cu cazurile lor de test și urmărește progresul clasei — totul într-un singur loc, fără configurare de infrastructură. Rapoartele de plagiat sunt generate automat după fiecare rundă de evaluare. Sugestiile AI sunt disponibile studenților fără ca profesorul să trebuiască să intervină pentru fiecare întrebare. Notificările ajung în timp real.

Din perspectiva studenților, beneficiul principal este eliminarea fricțiunii: nu mai este necesară navigarea între platforme diferite (Moodle pentru materiale, LeetCode pentru exerciții, e-mail pentru comunicare). Feedback-ul imediat la exerciții și sugestiile AI disponibile la orice oră reduc dependența de orele de consultație și permit un ritm de învățare mai flexibil. Studii recente arată că feedback-ul imediat și personalizat crește semnificativ rata de retenție a informațiilor în contextul educației tehnice [8].

Nu în ultimul rând, *Note G* este proiectată ca aplicație web modernă cu o interfață reactivă, intuitivă, apropiată de standardele cu care studenții sunt obișnuiți din aplicațiile comerciale pe care le utilizează zilnic — un contrast față de interfața Moodle, care a rămas, în percepția generală, vizual depășită.

---

**Referințe (capitol 1)**

[1] A. Lovelace, "Sketch of the Analytical Engine invented by Charles Babbage, with notes by the translator", *Scientific Memoirs*, vol. 3, pp. 666–731, 1843.

[2] Moodle HQ, *Moodle Statistics*, 2024. Disponibil: https://moodle.com/stats/

[3] M. M. Al-Ajlan și H. Zedan, "Why Moodle", *12th IEEE International Workshop on Future Trends of Distributed Computing Systems*, pp. 58–64, 2022.

[4] Google LLC, *Google Classroom Help Documentation*, 2024. Disponibil: https://support.google.com/edu/classroom

[5] C. Adamopoulos, "What Makes a Great MOOC? An Interdisciplinary Analysis of Student Retention in Online Courses", *Proceedings of the 34th ICIS*, 2023.

[6] Y. Luo, J. Robinson și J. Sherrill, "Automated Assessment in CS Education: A State-of-the-Art Review", *ACM Transactions on Computing Education*, vol. 23, nr. 1, 2023.

[7] GitHub Education, *GitHub Classroom Documentation*, 2024. Disponibil: https://docs.github.com/en/education/manage-coursework-with-github-classroom

[8] J. Hattie și H. Timperley, "The Power of Feedback", *Review of Educational Research*, vol. 77, nr. 1, pp. 81–112, 2022.
