// Test syntax of the addCourse function
const addCourse = async () => {
  if (!courseUrl.trim()) {
    Alert.alert('Error', 'Please enter a scorecard URL');
    return;
  }

  setIsLoading(true);
  try {
    // Scrape the course data from the URL
    const scrapeResponse = await fetch('http://localhost:3001/api/golf/scrape-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: courseUrl.trim() }),
    });

    const scrapeData = await scrapeResponse.json();

    if (scrapeData.success) {
      const newCourse = {
        id: Date.now().toString(),
        name: scrapeData.course.name,
        location: scrapeData.course.location,
        totalPar: scrapeData.course.totalPar,
        holes: scrapeData.course.holes,
        tees: scrapeData.course.tees,
        url: courseUrl.trim()
      };

      // If this is an existing tournament, save the course to the backend immediately
      if (isExisting && tournament && user && sessionToken) {
        try {
          const addResponse = await fetch(`http://localhost:3001/api/tournaments/${tournament.id}/courses`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${sessionToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ course: newCourse }),
          });

          const addData = await addResponse.json();

          if (addData.success) {
            setTournament(addData.tournament);
            setCourses(addData.tournament.courses);
            Alert.alert('Success', `${scrapeData.course.name} added to tournament and saved!`);
          } else {
            Alert.alert('Error', addData.error || 'Failed to save course to tournament');
            return;
          }
        } catch (saveError) {
          console.error('Error saving course to tournament:', saveError);
          Alert.alert('Error', 'Failed to save course to tournament. Please try again.');
          return;
        }
      } else {
        // For new tournaments, just add to local state
        setCourses(prevCourses => [...prevCourses, newCourse]);
        Alert.alert('Success', `${scrapeData.course.name} added to tournament!`);
      }

      setCourseUrl('');
      setShowAddCourseModal(false);
    } else {
      Alert.alert('Error', 'Failed to scrape course data from the provided URL');
    }
  } catch (error) {
    console.error('Error adding course:', error);
    Alert.alert('Error', 'Failed to connect to server. Please try again.');
  } finally {
    setIsLoading(false);
  }
};