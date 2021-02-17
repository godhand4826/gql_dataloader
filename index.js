const { ApolloServer, gql } = require('apollo-server');
const DataLoader = require('dataloader')

const typeDefs = gql`
  type Query {
    user(name: String!): User
    allUsers: [User]
    userByIds(ids: [Int]!): [User]
  }

  type User{
    id: Int
    name: String
    bestFriend: User
    followingUsers: [User]
  }
`;

const db = (() => {
    const users = [
        { id: 1, name: 'A', bestFriendId: 2, followingUserIds: [2, 3, 4] },
        { id: 2, name: 'B', bestFriendId: 1, followingUserIds: [1, 3, 4, 5] },
        { id: 3, name: 'C', bestFriendId: 4, followingUserIds: [1, 2, 5] },
        { id: 4, name: 'D', bestFriendId: 5, followingUserIds: [1, 2, 5] },
        { id: 5, name: 'E', bestFriendId: 4, followingUserIds: [2, 3, 4] }
    ];

    const wait = (value, text) =>
        new Promise(resolve => {
            setTimeout(() => {
                console.log(text);
                return resolve(value);
            }, 200);
        });

    return {
        getUserById: id => wait(
            users.find(user => user.id === id), `getUserById: ${id}`
        ),
        getUserByName: name => wait(
            users.find(user => user.name === name),
            `getUserByName: ${name}`
        ),
        getUsersByIds: ids => wait(
            users.filter(user => ids.includes(user.id)),
            `getUsersByIds: ${ids}`
        ),
        getAllUsers: () => wait(
            users, 'getAllUsers'
        )
    };
})();


const resolvers = {
    Query: {
        userByIds(root, { ids }, { dataloaders }) {
            return dataloaders.users.loadMany(ids)
        },
        user(root, { name }, { db }) {
            return db.getUserByName(name)
        },
        allUsers(root, args, { db }) {
            return db.getAllUsers()
        }
    },
    User: {
        async followingUsers(user, _, { dataloaders }) {
            return dataloaders.users.loadMany(user.followingUserIds)
        },
        async bestFriend(user, _, { dataloaders }) {
            return dataloaders.users.load(user.bestFriendId)
        }
    }
};

const server = new ApolloServer({
    typeDefs,
    resolvers,
    tracing: true,
    context: async req => {
        return {
            db,
            dataloaders: {
                users: new DataLoader(async userIds => {
                    const users = await db.getUsersByIds(userIds)
                    return users.sort(
                        (a, b) => userIds.indexOf(a.id) - userIds.indexOf(b.id)
                    )
                })
            }
        }
    }
});

server.listen().then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
});
