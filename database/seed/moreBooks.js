/* Extra sample titles so the catalog has 200+ books (filters, shelves and floors have something to chew on).
 * Format per category: 'Title | Author | year'. Synthetic ISBNs are assigned by position in data.js. */
const SETS = {
  Fiction: [
    'Emma | Jane Austen | 1815', 'Persuasion | Jane Austen | 1817', 'Sense and Sensibility | Jane Austen | 1811', 'Jane Eyre | Charlotte Brontë | 1847',
    'Wuthering Heights | Emily Brontë | 1847', 'Great Expectations | Charles Dickens | 1861', 'Oliver Twist | Charles Dickens | 1838', 'A Tale of Two Cities | Charles Dickens | 1859',
    'Middlemarch | George Eliot | 1871', 'Anna Karenina | Leo Tolstoy | 1878', 'War and Peace | Leo Tolstoy | 1869', 'Crime and Punishment | Fyodor Dostoevsky | 1866',
    'The Brothers Karamazov | Fyodor Dostoevsky | 1880', 'Madame Bovary | Gustave Flaubert | 1856', 'Les Misérables | Victor Hugo | 1862', 'The Count of Monte Cristo | Alexandre Dumas | 1844',
    'Moby-Dick | Herman Melville | 1851', 'The Scarlet Letter | Nathaniel Hawthorne | 1850', 'Adventures of Huckleberry Finn | Mark Twain | 1884', 'Little Women | Louisa May Alcott | 1868',
    'The Picture of Dorian Gray | Oscar Wilde | 1890', 'Dracula | Bram Stoker | 1897', 'Heart of Darkness | Joseph Conrad | 1899', 'Ulysses | James Joyce | 1922',
    'Mrs Dalloway | Virginia Woolf | 1925', 'To the Lighthouse | Virginia Woolf | 1927', 'The Sun Also Rises | Ernest Hemingway | 1926', 'The Old Man and the Sea | Ernest Hemingway | 1952',
    'The Grapes of Wrath | John Steinbeck | 1939', 'Of Mice and Men | John Steinbeck | 1937', 'To Kill a Mockingbird | Harper Lee | 1960', 'The Catcher in the Rye | J. D. Salinger | 1951',
    'Lolita | Vladimir Nabokov | 1955', 'Catch-22 | Joseph Heller | 1961', 'Slaughterhouse-Five | Kurt Vonnegut | 1969', 'Beloved | Toni Morrison | 1987',
    'Things Fall Apart | Chinua Achebe | 1958', 'The Stranger | Albert Camus | 1942', 'The Trial | Franz Kafka | 1925', 'The Metamorphosis | Franz Kafka | 1915',
    'Siddhartha | Hermann Hesse | 1922', 'Love in the Time of Cholera | Gabriel García Márquez | 1985', 'The Alchemist | Paulo Coelho | 1988', 'Life of Pi | Yann Martel | 2001',
    'The Kite Runner | Khaled Hosseini | 2003', 'Atonement | Ian McEwan | 2001', 'The Remains of the Day | Kazuo Ishiguro | 1989', 'Norwegian Wood | Haruki Murakami | 1987',
    'Don Quixote | Miguel de Cervantes | 1605', 'Candide | Voltaire | 1759', 'Gulliver’s Travels | Jonathan Swift | 1726', 'Treasure Island | Robert Louis Stevenson | 1883',
  ],
  'Science Fiction': [
    'Foundation | Isaac Asimov | 1951', 'I, Robot | Isaac Asimov | 1950', 'Do Androids Dream of Electric Sheep? | Philip K. Dick | 1968', 'The Time Machine | H. G. Wells | 1895',
    'The War of the Worlds | H. G. Wells | 1898', 'Twenty Thousand Leagues Under the Sea | Jules Verne | 1870', '1984 | George Orwell | 1949', 'Animal Farm | George Orwell | 1945',
    'Brave New World | Aldous Huxley | 1932', 'Fahrenheit 451 | Ray Bradbury | 1953', 'The Martian Chronicles | Ray Bradbury | 1950', 'Ender’s Game | Orson Scott Card | 1985',
    'Snow Crash | Neal Stephenson | 1992', 'The Hitchhiker’s Guide to the Galaxy | Douglas Adams | 1979', 'Hyperion | Dan Simmons | 1989', 'The Dispossessed | Ursula K. Le Guin | 1974',
    'Solaris | Stanisław Lem | 1961', 'Childhood’s End | Arthur C. Clarke | 1953', '2001: A Space Odyssey | Arthur C. Clarke | 1968', 'The Three-Body Problem | Liu Cixin | 2008',
    'Station Eleven | Emily St. John Mandel | 2014', 'The Handmaid’s Tale | Margaret Atwood | 1985', 'Kindred | Octavia E. Butler | 1979', 'The Road | Cormac McCarthy | 2006',
    'The Martian | Andy Weir | 2011', 'Project Hail Mary | Andy Weir | 2021',
  ],
  Fantasy: [
    'The Hobbit | J. R. R. Tolkien | 1937', 'The Fellowship of the Ring | J. R. R. Tolkien | 1954', 'A Game of Thrones | George R. R. Martin | 1996', 'The Name of the Wind | Patrick Rothfuss | 2007',
    'The Lion, the Witch and the Wardrobe | C. S. Lewis | 1950', 'American Gods | Neil Gaiman | 2001', 'Good Omens | Terry Pratchett & Neil Gaiman | 1990', 'Mort | Terry Pratchett | 1987',
    'A Wizard of Earthsea | Ursula K. Le Guin | 1968', 'Mistborn: The Final Empire | Brandon Sanderson | 2006',
  ],
  Mystery: [
    'And Then There Were None | Agatha Christie | 1939', 'Murder on the Orient Express | Agatha Christie | 1934', 'The Hound of the Baskervilles | Arthur Conan Doyle | 1902',
    'A Study in Scarlet | Arthur Conan Doyle | 1887', 'The Big Sleep | Raymond Chandler | 1939', 'The Maltese Falcon | Dashiell Hammett | 1930', 'Rebecca | Daphne du Maurier | 1938',
    'Gone Girl | Gillian Flynn | 2012', 'The Girl with the Dragon Tattoo | Stieg Larsson | 2005', 'The Name of the Rose | Umberto Eco | 1980', 'In Cold Blood | Truman Capote | 1966',
  ],
  Science: [
    'On the Origin of Species | Charles Darwin | 1859', 'The Double Helix | James D. Watson | 1968', 'A Short History of Nearly Everything | Bill Bryson | 2003', 'Pale Blue Dot | Carl Sagan | 1994',
    'The Demon-Haunted World | Carl Sagan | 1995', 'Astrophysics for People in a Hurry | Neil deGrasse Tyson | 2017', 'The Elegant Universe | Brian Greene | 1999', 'Six Easy Pieces | Richard Feynman | 1994',
    'Gödel, Escher, Bach | Douglas Hofstadter | 1979', 'The Structure of Scientific Revolutions | Thomas Kuhn | 1962', 'The Gene | Siddhartha Mukherjee | 2016', 'Genome | Matt Ridley | 1999',
    'The Sixth Extinction | Elizabeth Kolbert | 2014', 'The Hidden Life of Trees | Peter Wohlleben | 2015', 'Braiding Sweetgrass | Robin Wall Kimmerer | 2013', 'Chaos | James Gleick | 1987',
    'Why We Sleep | Matthew Walker | 2017',
  ],
  Technology: [
    'Code | Charles Petzold | 1999', 'The Mythical Man-Month | Frederick P. Brooks Jr. | 1975', 'Structure and Interpretation of Computer Programs | Abelson & Sussman | 1985', 'Refactoring | Martin Fowler | 1999',
    'Design Patterns | Gamma, Helm, Johnson & Vlissides | 1994', 'The C Programming Language | Kernighan & Ritchie | 1978', 'Code Complete | Steve McConnell | 1993', 'Cracking the Coding Interview | Gayle Laakmann McDowell | 2008',
    'The Phoenix Project | Gene Kim | 2013', 'Clean Architecture | Robert C. Martin | 2017', 'Hackers | Steven Levy | 1984', 'The Innovators | Walter Isaacson | 2014',
    'Algorithms to Live By | Brian Christian & Tom Griffiths | 2016', 'Deep Learning | Goodfellow, Bengio & Courville | 2016', 'Python Crash Course | Eric Matthes | 2015', 'Fluent Python | Luciano Ramalho | 2015',
    'JavaScript: The Good Parts | Douglas Crockford | 2008', 'Learning SQL | Alan Beaulieu | 2005', 'Site Reliability Engineering | Beyer, Jones, Petoff & Murphy | 2016',
  ],
  History: [
    'A People’s History of the United States | Howard Zinn | 1980', 'SPQR | Mary Beard | 2015', 'The Rise and Fall of the Third Reich | William L. Shirer | 1960', 'Team of Rivals | Doris Kearns Goodwin | 2005',
    'The Silk Roads | Peter Frankopan | 2015', '1491 | Charles C. Mann | 2005', 'Postwar | Tony Judt | 2005', 'The Guns of August | Barbara W. Tuchman | 1962', 'Prisoners of Geography | Tim Marshall | 2015',
  ],
  Biography: [
    'Educated | Tara Westover | 2018', 'I Know Why the Caged Bird Sings | Maya Angelou | 1969', 'Becoming | Michelle Obama | 2018', 'Born a Crime | Trevor Noah | 2016',
    'Einstein: His Life and Universe | Walter Isaacson | 2007', 'Leonardo da Vinci | Walter Isaacson | 2017', 'Alexander Hamilton | Ron Chernow | 2004', 'The Autobiography of Malcolm X | Malcolm X & Alex Haley | 1965',
    'Just Kids | Patti Smith | 2010', 'Persepolis | Marjane Satrapi | 2000', 'Unbroken | Laura Hillenbrand | 2010',
  ],
  Philosophy: [
    'Nicomachean Ethics | Aristotle | 350', 'Apology | Plato | 380', 'Beyond Good and Evil | Friedrich Nietzsche | 1886', 'Critique of Pure Reason | Immanuel Kant | 1781', 'Leviathan | Thomas Hobbes | 1651',
    'The Prince | Niccolò Machiavelli | 1532', 'Utopia | Thomas More | 1516', 'The Social Contract | Jean-Jacques Rousseau | 1762', 'Walden | Henry David Thoreau | 1854', 'Letters from a Stoic | Seneca | 65',
    'The Art of War | Sun Tzu | 500', 'Tao Te Ching | Laozi | 400', 'The Myth of Sisyphus | Albert Camus | 1942', 'Sophie’s World | Jostein Gaarder | 1991', 'Justice | Michael J. Sandel | 2009',
    'On Liberty | John Stuart Mill | 1859', 'The Second Sex | Simone de Beauvoir | 1949',
  ],
  Language: [
    'Eats, Shoots & Leaves | Lynne Truss | 2003', 'The Language Instinct | Steven Pinker | 1994', 'Bird by Bird | Anne Lamott | 1994', 'On Writing | Stephen King | 2000',
    'Politics and the English Language | George Orwell | 1946', 'The Sense of Style | Steven Pinker | 2014',
  ],
  'Art & Design': [
    'Don’t Make Me Think | Steve Krug | 2000', 'The Elements of Typographic Style | Robert Bringhurst | 1992', 'Steal Like an Artist | Austin Kleon | 2012', 'The Art Spirit | Robert Henri | 1923',
    'A Pattern Language | Christopher Alexander | 1977', 'Interaction of Color | Josef Albers | 1963', 'The Non-Designer’s Design Book | Robin Williams | 1994', 'Grid Systems in Graphic Design | Josef Müller-Brockmann | 1981',
  ],
  Mathematics: [
    'Fermat’s Enigma | Simon Singh | 1997', 'The Man Who Knew Infinity | Robert Kanigel | 1991', 'A Mathematician’s Apology | G. H. Hardy | 1940', 'Euclid’s Elements | Euclid | 300',
    'Calculus Made Easy | Silvanus P. Thompson | 1910', 'Naked Statistics | Charles Wheelan | 2012', 'How Not to Be Wrong | Jordan Ellenberg | 2014', 'Linear Algebra Done Right | Sheldon Axler | 1995',
  ],
  Business: [
    'Freakonomics | Steven D. Levitt & Stephen J. Dubner | 2005', 'Capital in the Twenty-First Century | Thomas Piketty | 2013', 'Poor Economics | Abhijit Banerjee & Esther Duflo | 2011',
    'Nudge | Richard H. Thaler & Cass R. Sunstein | 2008', 'The Lean Startup | Eric Ries | 2011', 'Zero to One | Peter Thiel | 2014', 'Good to Great | Jim Collins | 2001',
    'The Innovator’s Dilemma | Clayton M. Christensen | 1997', 'The Intelligent Investor | Benjamin Graham | 1949', 'Influence | Robert B. Cialdini | 1984', 'Start with Why | Simon Sinek | 2009',
    'Deep Work | Cal Newport | 2016', 'The 7 Habits of Highly Effective People | Stephen R. Covey | 1989', 'Thinking in Systems | Donella H. Meadows | 2008', 'The Black Swan | Nassim Nicholas Taleb | 2007',
  ],
  Psychology: [
    'Flow | Mihaly Csikszentmihalyi | 1990', 'Quiet | Susan Cain | 2012', 'Mindset | Carol S. Dweck | 2006', 'Grit | Angela Duckworth | 2016', 'Emotional Intelligence | Daniel Goleman | 1995',
    'Predictably Irrational | Dan Ariely | 2008', 'The Body Keeps the Score | Bessel van der Kolk | 2014', 'Drive | Daniel H. Pink | 2009', 'Blink | Malcolm Gladwell | 2005', 'Outliers | Malcolm Gladwell | 2008',
    'The Happiness Hypothesis | Jonathan Haidt | 2006', 'Atomic Habits | James Clear | 2018',
  ],
  Children: [
    'Matilda | Roald Dahl | 1988', 'Charlie and the Chocolate Factory | Roald Dahl | 1964', 'Harry Potter and the Philosopher’s Stone | J. K. Rowling | 1997', 'Alice’s Adventures in Wonderland | Lewis Carroll | 1865',
    'Peter Pan | J. M. Barrie | 1911', 'The Wind in the Willows | Kenneth Grahame | 1908', 'Winnie-the-Pooh | A. A. Milne | 1926', 'Where the Wild Things Are | Maurice Sendak | 1963',
    'Anne of Green Gables | L. M. Montgomery | 1908', 'The Secret Garden | Frances Hodgson Burnett | 1911', 'Heidi | Johanna Spyri | 1881', 'The Phantom Tollbooth | Norton Juster | 1961',
    'Holes | Louis Sachar | 1998', 'Wonder | R. J. Palacio | 2012', 'Bridge to Terabithia | Katherine Paterson | 1977',
  ],
  Poetry: [
    'Leaves of Grass | Walt Whitman | 1855', 'The Waste Land | T. S. Eliot | 1922', 'Paradise Lost | John Milton | 1667', 'The Divine Comedy | Dante Alighieri | 1320', 'Ariel | Sylvia Plath | 1965',
    'Howl and Other Poems | Allen Ginsberg | 1956', 'The Odyssey | Homer | 700', 'The Iliad | Homer | 750', 'Beowulf | Anonymous | 1000',
  ],
  Drama: [
    'Hamlet | William Shakespeare | 1603', 'Macbeth | William Shakespeare | 1606', 'Romeo and Juliet | William Shakespeare | 1597', 'A Midsummer Night’s Dream | William Shakespeare | 1600',
    'Death of a Salesman | Arthur Miller | 1949', 'A Streetcar Named Desire | Tennessee Williams | 1947', 'Waiting for Godot | Samuel Beckett | 1953', 'A Doll’s House | Henrik Ibsen | 1879',
    'Pygmalion | George Bernard Shaw | 1913', 'The Importance of Being Earnest | Oscar Wilde | 1895',
  ],
  Cooking: [
    'Salt, Fat, Acid, Heat | Samin Nosrat | 2017', 'Kitchen Confidential | Anthony Bourdain | 2000', 'Mastering the Art of French Cooking | Julia Child | 1961', 'The Omnivore’s Dilemma | Michael Pollan | 2006',
    'How to Cook Everything | Mark Bittman | 1998',
  ],
  Travel: [
    'Into the Wild | Jon Krakauer | 1996', 'Into Thin Air | Jon Krakauer | 1997', 'A Walk in the Woods | Bill Bryson | 1998', 'Travels with Charley | John Steinbeck | 1962',
    'Notes from a Small Island | Bill Bryson | 1995', 'Shantaram | Gregory David Roberts | 2003',
  ],
};

const MORE = [];
for (const [category, rows] of Object.entries(SETS)) {
  for (const row of rows) {
    const [title, author, year] = row.split(' | ');
    MORE.push([title, author, category, Number(year)]);
  }
}
module.exports = { MORE };
