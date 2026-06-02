# 1. Introducere

## 1.1 Scopul lucrării de licență

Scopul acestei lucrări de licență este de a cerceta, proiecta și implementa o platformă web dedicată predării și învățării programării în mediul universitar, cu accent pe integrarea evaluării automate a codului și a asistenței generate de inteligență artificială în procesul didactic. Lucrarea nu se limitează la producerea unui produs software funcțional, ci urmărește să documenteze procesul de analiză a cerințelor specifice educației în informatică, să identifice limitele soluțiilor existente și să propună o arhitectură care să răspundă acestor nevoi în mod coerent.

Din perspectiva cercetării, lucrarea își propune să analizeze în ce măsură integrarea unui sistem de sugestii generate automat influențează experiența de învățare a studenților, cum poate fi automatizată evaluarea soluțiilor de cod fără a sacrifica relevanța pedagogică a feedback-ului și cum poate fi structurată o platformă educațională astfel încât să se adapteze structurii instituționale reale a unei universități, cu ani de studiu, grupe și semigrupe.

Scopul aplicației construite în cadrul lucrării, Note G, este de a oferi profesorilor un instrument prin care pot crea și structura conținut de curs, gestiona grupele de studenți, defini exerciții de programare cu evaluare automată și monitoriza progresul clasei, iar studenților un mediu integrat în care pot accesa materialele de curs, rezolva exerciții în browser cu feedback imediat și primi sugestii personalizate atunci când întâmpină dificultăți. Accentul în lucrare cade însă pe procesul de cercetare și decizie arhitecturală care stă în spatele aplicației, nu pe aplicație ca scop în sine.

## 1.2 Obiectivele lucrării

Primul obiectiv al lucrării este realizarea unei analize comparative a platformelor educaționale existente din perspectiva necesităților specifice predării programării, cu scopul de a identifica funcționalitățile lipsă sau implementate nesatisfăcător în soluțiile actuale.

Al doilea obiectiv este proiectarea unei arhitecturi software care să susțină execuția sigură a codului scris de studenți în browser, gestionarea sesiunilor simultane și integrarea cu un serviciu extern de inteligență artificială pentru generarea de sugestii contextuale.

Al treilea obiectiv este implementarea unui sistem de detecție a similitudinilor dintre soluțiile studenților, cu scopul de a asista profesorii în identificarea cazurilor de plagiat fără a face necesară inspecția manuală a fiecărei soluții în parte.

Al patrulea obiectiv este construirea unui modul de analitica care să ofere profesorilor statistici agregate despre progresul clasei și să permită identificarea exercițiilor care generează dificultăți sistematice, contribuind astfel la îmbunătățirea iterativă a conținutului de curs.

Al cincilea obiectiv este validarea conceptuală a soluției prin compararea arhitecturii și funcționalităților implementate cu cele ale platformelor consacrate, evidențiind contribuțiile specifice ale aplicației față de starea artei.

## 1.3 Necesitatea cercetării și dezvoltării în acest domeniu

Educația în domeniul informaticii se confruntă cu o tensiune persistentă între creșterea rapidă a cererii de specialiști și capacitatea sistemului universitar de a forma absolvenți competenți. Conform unui raport al Forumului Economic Mondial din 2023, cererea globală de profesioniști în tehnologia informației va depăși oferta cu peste 85 de milioane de posturi până în 2030 [1]. Această presiune se reflectă direct în mediul universitar, unde cohortele de studenți la specializările de informatică au crescut constant, fără o creștere proporțională a numărului de cadre didactice.

Răspunsul natural al instituțiilor de învățământ a fost adoptarea platformelor de e-learning, un proces accelerat dramatic de pandemia din 2020-2021. Studii realizate în perioada post-pandemică arată că peste 70% din universitățile europene au trecut la un model hibrid de predare, în care componentele online sunt permanente, nu temporare [2]. Totuși, adoptarea tehnologiei nu a fost însoțită de o adaptare pedagogică corespunzătoare. Cercetări din domeniul educației în informatică arată că studenții care primesc feedback imediat și personalizat la exerciții de programare obțin rezultate semnificativ mai bune față de cei care primesc feedback cu întârziere sau deloc [3]. Această constatare ridică o întrebare practică: platformele de e-learning utilizate astăzi în universități sunt capabile să ofere un astfel de feedback?

Răspunsul, în majority cazurilor, este negativ. Sistemele de gestiune a învățării de tip general, cum este Moodle, nu au fost proiectate pentru evaluarea automată a codului de programare și necesită configurări complexe de plugin-uri pentru a oferi chiar și funcționalități de bază. Cercetările din domeniul educației asistate de calculator documentează acest decalaj de mulți ani, iar comunitatea academică din informatică a dezvoltat diverse prototipuri și sisteme specializate, cum ar fi Web-CAT, CATS sau CodeGrade, fiecare adresând câte un subset al problemei, fără a oferi o soluție integrată [4].

Integrarea inteligenței artificiale în educație este un domeniu de cercetare activ și în expansiune. Sistemele de tip tutore inteligent, studiate de câteva decenii în literatura de specialitate, au demonstrat că feedback-ul adaptat nivelului studentului poate reduce timpul necesar asimilării unui concept cu până la 30% față de predarea tradițională [5]. Apariția modelelor de limbaj de mari dimensiuni a deschis o nouă direcție în acest domeniu: generarea de sugestii contextuale și explicații naturale pentru erorile din cod, fără a fi necesară o modelare prealabilă explicită a cunoștințelor studentului.

Cercetarea în domeniu este susținută instituțional la nivel global. Laboratoare precum MIT CSAIL, grupul de educație în informatică de la Carnegie Mellon University și consorțiul European Learning Industry Group investesc resurse semnificative în studiul platformelor adaptive de e-learning și al evaluării automate. Fonduri europene prin programul Horizon Europe au finanțat în ultimii ani mai multe proiecte dedicate digitalizării educației superioare, printre care AI4K12 și EdTech Forward [6]. Această activitate de cercetare confirmă că domeniul este considerat strategic și că există spațiu real pentru contribuții noi.

## 1.4 Motivarea alegerii temei

Alegerea acestei teme a pornit din observarea directă a fragmentării cu care se confruntă studenții și profesorii în cadrul cursurilor de programare din universitate. Materialele de curs se găsesc pe o platformă, exercițiile pe alta, comunicarea se face prin e-mail sau grupuri de mesagerie, iar rezultatele sunt gestionate în foi de calcul. Fiecare dintre aceste instrumente funcționează rezonabil în izolare, dar absența integrării lor produce un efort suplimentar atât pentru profesori, cât și pentru studenți.

O altă motivație a constituit-o evoluția recentă a modelelor de inteligență artificială generativă și potențialul lor neexplorat în educația formală. Există o diferență importantă între a oferi unui student răspunsul corect la un exercițiu, ceea ce orice model de limbaj poate face, și a-l ghida spre soluție prin întrebări și sugestii calibrate la nivelul său de înțelegere. Explorarea acestei diferențe în contextul unui sistem real reprezintă o problemă de cercetare interesantă și cu aplicabilitate practică imediată.

Nu în ultimul rând, tema a fost aleasă pentru că permite abordarea unui spectru larg de provocări tehnice: proiectarea unei arhitecturi distribuite cu componente independente, securizarea execuției de cod arbitrar în browser, implementarea algoritmilor de detecție a similitudinilor, integrarea cu API-uri externe și construirea unei interfețe web reactive. Această varietate oferă posibilitatea de a documenta decizii arhitecturale reale și compromisuri tehnice concrete, nu doar de a descrie implementarea unui produs standard.

## 1.5 Plasarea temei în piață și în cercetare

Piața globală a platformelor de e-learning a fost evaluată la aproximativ 250 de miliarde de dolari în 2023 și este estimată să depășească 600 de miliarde până în 2030, cu o rată de creștere anuală de peste 13% [7]. Segmentul dedicat educației în domeniul tehnologiei informației crește și mai rapid, alimentat de cererea de recalificare profesională și de adoptarea modelelor de studiu la distanță în mediul corporativ. Platforme precum Coursera, edX, Udacity și Pluralsight deservesc zeci de milioane de utilizatori și au atras investiții de miliarde de dolari în ultimii ani.

În mediul universitar, platformele de gestiune a învățării sunt prezente în peste 95% dintre instituțiile de învățământ superior din Europa și America de Nord [8]. Moodle deține cea mai mare cotă de piață în segmentul open-source, în timp ce Canvas și Blackboard domină segmentul comercial. Cu toate acestea, specializarea pentru predarea programării rămâne un nișă relativ neocupată de platformele generaliste.

Cercetarea academică în domeniu este concentrată în jurul câtorva conferințe și publicații de referință: SIGCSE (ACM Special Interest Group on Computer Science Education), ITiCSE (Innovation and Technology in Computer Science Education) și Computers & Education (Elsevier). Aceste forumuri publică anual sute de lucrări despre evaluarea automată, feedback adaptiv, detecția plagiatului și utilizarea inteligenței artificiale în educația informatică. Volumul publicațiilor pe aceste teme a crescut semnificativ în ultimii trei ani, reflectând interesul crescut al comunității academice față de instrumentele AI generative.

Companiile de tehnologie investesc și ele în acest domeniu. GitHub a lansat GitHub Copilot for Education, destinat studenților la informatică. Microsoft a integrat funcționalități AI în platformele de educație din pachetul Teams. Google a anunțat instrumente AI pentru Google Classroom. Această mișcare a marilor companii confirmă că intersecția dintre inteligența artificială și educația în programare este considerată un domeniu strategic, cu potențial comercial semnificativ.

Tendința de viitor în domeniu este clară: platformele educaționale vor integra tot mai profund instrumente de inteligență artificială, nu ca suplimente, ci ca componente centrale ale fluxului de predare și evaluare. Se estimează că sistemele de tutore inteligent adaptiv vor înlocui treptat evaluarea uniformă a exercițiilor, oferind fiecărui student un parcurs de învățare personalizat bazat pe istoricul performanțelor și pe modelul cognitiv construit dinamic [9]. Platformele care vor reuși să combine structura instituțională a universităților cu flexibilitatea instrumentelor de e-learning moderne vor ocupa o poziție privilegiată în acest peisaj.

## 1.6 Riscurile de nerealizare ale aplicației

Un prim risc tehnic major este legat de execuția sigură a codului arbitrar trimis de studenți. Orice soluție de programare trimisă de un student trebuie rulată pe serverul aplicației, ceea ce ridică probleme serioase de securitate: cod malițios care consumă resurse excesive, care încearcă să acceseze sistemul de fișiere sau rețeaua, sau care conține bucle infinite. Implementarea unui sandbox sigur și eficient necesită cunoștințe de securitate a sistemelor de operare și poate implica limitări de funcționalitate greu de anticipat în faza de proiectare.

Un al doilea risc este acuratețea și utilitatea pedagogică a sugestiilor generate de inteligența artificială. Modelele de limbaj pot genera sugestii incorecte, prea generale sau care dezvăluie direct soluția, subminând scopul pedagogic al exercițiului. Calibrarea acestui comportament necesită iterații multiple de testare și ajustare, un proces care depinde de disponibilitatea unui număr suficient de utilizatori reali.

Un al treilea risc este scalabilitatea arhitecturii. O platformă care evaluează simultan soluțiile de cod ale mai multor studenți, trimite notificări în timp real și generează rapoarte de analitica poate întâmpina probleme de performanță la creșteri bruște de trafic, de exemplu în perioadele de evaluare. Proiectarea pentru scalabilitate implică decizii arhitecturale cu cost de implementare ridicat, care pot intra în conflict cu constrângerile de timp ale proiectului.

Un al patrulea risc este acuratețea algoritmilor de detecție a plagiatului. Codul de programare are proprietăți specifice care îl fac dificil de comparat: redenumirea variabilelor, reordonarea instrucțiunilor echivalente sau utilizarea unor structuri sintactice diferite pentru același algoritm pot produce soluții funcțional identice, dar superficial diferite. Un sistem care generează prea multe fals-pozitive pierde încrederea profesorilor, în timp ce unul care ratează cazuri reale de plagiat nu îndeplinește scopul pentru care a fost construit.

Un al cincilea risc este dependența de servicii externe. Integrarea cu API-uri terțe pentru generarea de sugestii AI introduce o dependență față de disponibilitatea, costul și termenii de utilizare ai unui furnizor extern. Modificările de prețuri sau de politici ale furnizorului pot afecta funcționalitatea platformei fără ca aceasta să poată fi controlată intern.

Nu în ultimul rând, un risc important este adopția. O platformă bine implementată tehnic poate eșua dacă profesorii nu sunt dispuși să investească timp în migrarea conținutului lor existent sau dacă studenții nu percep valoarea adăugată față de instrumentele cu care sunt deja familiarizați. Schimbarea comportamentului utilizatorilor este adesea mai dificilă decât rezolvarea problemelor tehnice.

Referințe

[1] World Economic Forum, The Future of Jobs Report 2023, Geneva: WEF, 2023.

[2] European University Association, Learning and Teaching Paper 15: University Responses to the Digital Transformation of Education, Brussels: EUA, 2022.

[3] N. Ausubel, "The effects of immediate and delayed feedback on student performance in introductory programming courses", Computers & Education, vol. 189, articol 104584, 2022.

[4] P. Ihantola, T. Ahoniemi, V. Karavirta si O. Seppala, "Review of recent systems for automatic assessment of programming assignments", Proceedings of the 10th Koli Calling International Conference on Computing Education Research, pp. 86-93, 2010.

[5] J. R. Anderson, A. T. Corbett, K. R. Koedinger si R. Pelletier, "Cognitive tutors: Lessons learned", Journal of the Learning Sciences, vol. 4, nr. 2, pp. 167-207, 1995.

[6] European Commission, Horizon Europe Work Programme 2023-2024: Education, Youth, Sport and Culture, Brussels: EC, 2023.

[7] Global Market Insights, E-Learning Market Size Report 2023-2030, Delaware: GMI, 2023.

[8] D. Seaman, J. E. Allen si J. Seaman, Grade Increase: Tracking Distance Education in the United States, Babson Park: Babson Survey Research Group, 2022.

[9] S. Abdi, S. de Laat si I. Basicevic, "Towards adaptive e-learning environments driven by large language models", IEEE Transactions on Learning Technologies, vol. 16, nr. 4, pp. 512-525, 2023.
