// need an example app.
// how about there are users, who can have a name, a bio, and friends.

type user = {
  id: number;
  name: string;
  bio: string;
  friends: number[];
};

// getUser takes an id, and gets a representation of a user using their name,
// bio and friends list;

export const getStringifiedUser = async (id: number, users: user[]) => {
  const user = users.find((u) => u.id === id);
  if (!user) {
    throw new Error("User not found");
  }

  // Get the names of the user's friends
  const friendNames = user.friends
    .map((friendId) => {
      const friend = users.find((u) => u.id === friendId);
      return friend ? friend.name : null;
    })
    .filter((name): name is string => name !== null); // Filter out null values

  // Create the desired string representation
  return `${user.name}: ${user.bio}. Friends with ${friendNames.length > 0 ? friendNames.join(", ") : "no one"}`;
};

export const updateName = async (id: number, newName: string, users: user[]) => {
  // mutate in place
  console.log(
    `updating name for user ${users.find((user) => user.id === id)?.name} to ${newName}`,
  );
  const user = users.find((u) => u.id === id);
  if (!user) {
    throw new Error("User not found");
  }
  user.name = newName;
};

export const updateBio = async (id: number, newBio: string, users: user[]) => {
  const user = users.find((u) => u.id === id);
  if (!user) {
    throw new Error("User not found");
  }
  user.bio = newBio;
};
