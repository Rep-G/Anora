import mongoose from "mongoose";

export interface iUser {
    gs: Boolean,
    status: String,
    created: Date,
    banned: Boolean,
    discordId: string,
    accountId: string,
    fullLocker: boolean,
    claimedOG: boolean,
    claimedExclusive: boolean,
    username: string,
    username_lower: string,
    email: string,
    password: string,
    kills: number,
    wins: number,
    roles: Array<string>,
    avatarUrl: string
}

const UserSchema = new mongoose.Schema(
    {
        gs: {type: Boolean, required: false, default: false},
        status: { type: String, default: "offline"},
        created: { type: Date, required: true },
        wt: {type: String, required: false, default: "none"},
        banned: { type: Boolean, default: false },
        discordId: { type: String, required: true, unique: true },
        accountId: { type: String, required: true, unique: true },
        fullLocker: { type: Boolean, default: false },
        claimedOG: {type: Boolean, default: false},
        claimedExclusive: {type: Boolean, default: false},
        username: { type: String, required: true, unique: true },
        username_lower: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        kills: {type: Number, default: 0},
        wins: {type: Number, default: 0},
        roles: {type: Array, default: ["Member:7"]},
        avatarUrl: {type: String, default: "https://fortnite-api.com/images/cosmetics/br/cid_001_athena_commando_f_default/icon.png"}
    },
    {
        collection: "users"
    }
)

const model = mongoose.model('UserSchema', UserSchema);

export default model;