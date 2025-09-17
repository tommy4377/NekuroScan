// Nella sezione ContentSection, modifica il bottone "Vedi tutti":

{viewAllPath && (
  <Button
    variant="ghost"
    size="sm"
    rightIcon={<FaChevronRight />}
    onClick={() => {
      // Se è una sezione specifica, vai alla pagina dedicata
      if (viewAllPath.startsWith('/top/')) {
        navigate(viewAllPath);
      } else if (viewAllPath === '/latest-updates') {
        navigate('/latest');
      } else if (viewAllPath === '/popular') {
        navigate('/popular');
      } else {
        navigate(viewAllPath);
      }
    }}
    color={`${color}.400`}
    _hover={{ bg: `${color}.900` }}
  >
    Vedi tutti
  </Button>
)}

// E aggiorna le chiamate a ContentSection con i path corretti:

<ContentSection
  title="Capitoli recenti"
  icon={FaClock}
  items={latestUpdates}
  color="blue"
  viewAllPath="/latest-updates"
/>

<ContentSection
  title="I più amati della settimana"
  icon={FaHeart}
  items={mostFavorites}
  color="pink"
  viewAllPath="/popular"
/>

<ContentSection
  title="Top Manga Giapponesi"
  icon={GiDragonHead}
  items={topManga}
  color="orange"
  viewAllPath="/top/manga"
  iconSize={6}
/>

<ContentSection
  title="Top Manhwa Coreani"
  icon={BiBook}
  items={topManhwa}
  color="purple"
  viewAllPath="/top/manhwa"
  iconSize={5}
/>

// Aggiungi anche top Manhua e Oneshot
const [topManhua, setTopManhua] = useState([]);
const [topOneshot, setTopOneshot] = useState([]);

// Nel loadAllContent:
const [updates, favorites, manga, manhwa, manhua, oneshot] = await Promise.all([
  statsAPI.getLatestUpdates(includeAdult),
  statsAPI.getMostFavorites(includeAdult),
  statsAPI.getTopByType('manga'),
  statsAPI.getTopByType('manhwa'),
  statsAPI.getTopByType('manhua'),
  statsAPI.getTopByType('oneshot')
]);

setTopManhua(manhua.slice(0, 10));
setTopOneshot(oneshot.slice(0, 10));

// E aggiungi le sezioni:
<ContentSection
  title="Top Manhua Cinesi"
  icon={FaDragon}
  items={topManhua}
  color="red"
  viewAllPath="/top/manhua"
  iconSize={5}
/>

<ContentSection
  title="Top Oneshot"
  icon={FaBookOpen}
  items={topOneshot}
  color="green"
  viewAllPath="/top/oneshot"
  iconSize={5}
/>
